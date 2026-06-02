"use client";

import { useState, useEffect } from "react";
import type { SessionState } from "@/types/session";
import { StarButton } from "@/components/ui/star-button";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Mail,
  MessageSquare,
  Download,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { submitSession, addAuditEvent, createFollowUpTask, saveSession } from "@/lib/session";
import { downloadSummaryPDF } from "@/lib/pdf-export";
import { RemoteStatusTracker } from "@/components/RemoteStatusTracker";
import { syncSession, fetchSessionById, completeSession, patchAppointment, officeDispatch, sendEmail, sendSms } from "@/lib/api";
import { NEXT_STEPS_CONFIG, DELIVERABLES } from "./constants";
import { useTheme } from "@/components/ThemeProvider";

interface NextStepsProps {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
  onFinish: () => void;
}

export function B19NextSteps({ session, onUpdate, onBack, onFinish }: NextStepsProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark" || theme === "high-contrast";
  const outcome = session.findings.outcomeType || "no_damage";
  const isSigned = !!session.signatureData.signedAt;
  const isDeferred = session.sessionStatus === "deferred";
  const isSessionClosed = session.sessionStatus.startsWith("closed_") || session.sessionStatus === "signed";
  const outcomeKey = isDeferred ? "deferred" : (outcome || "no_damage");
  const config = NEXT_STEPS_CONFIG[outcomeKey] || NEXT_STEPS_CONFIG.no_damage;
  const [exported, setExported] = useState(false);
  const [deliverySent, setDeliverySent] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickEmail, setQuickEmail] = useState("");
  const [quickPhone, setQuickPhone] = useState("");

  const handleOfficeDispatch = async (s: SessionState) => {
    setIsDispatching(true);
    setError(null);
    try {
      const { getSummaryPDFBase64 } = await import("@/lib/pdf-export");
      const pdfBase64 = await getSummaryPDFBase64(s);
      const fileName = `Hustad_Dossier_${s.sessionId.slice(-6).toUpperCase()}.pdf`;

      const res = await officeDispatch({
        session: s,
        pdfBase64,
        fileName
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Office dispatch failed");

      const updated: SessionState = {
        ...s,
        officeDispatchStatus: "sent",
        officeDispatchedAt: data.dispatchedAt,
        reportUrl: data.reportUrl,
      };
      onUpdate(addAuditEvent(updated, "office_dispatch_success", { reportUrl: data.reportUrl }));
      return updated;
    } catch (err: any) {
      /* non-fatal */
      const updated: SessionState = {
        ...s,
        officeDispatchStatus: "error",
        officeDispatchError: err.message,
      };
      onUpdate(addAuditEvent(updated, "office_dispatch_error", { error: err.message }));
      setError(`Office dispatch failed: ${err.message}. Please retry manually.`);
      return updated;
    } finally {
      setIsDispatching(false);
    }
  };

  const handleFinish = async () => {
    setIsSyncing(true);
    try {
      // Ensure session has a closed status — no_damage/monitor_only skip B18 so submitSession is never called
      let finalSession = session;
      const alreadyClosed = session.sessionStatus.startsWith("closed_") || session.sessionStatus === "signed" || session.sessionStatus === "deferred";
      if (!alreadyClosed) {
        finalSession = submitSession(session);
        onUpdate(finalSession);
      }

      // Mark synced before saving
      finalSession = { ...finalSession, syncStatus: "synced" };
      saveSession(finalSession);
      onUpdate(finalSession);

      // Push to Supabase + update pipeline + queue CenterPoint write-back
      await syncSession(finalSession);

      // Directly call complete endpoint — RepCommandCenter is unmounted during inspection flow
      // so the sessionCompleted event below has no listener. These calls must happen here.
      await completeSession(finalSession.sessionId, finalSession.sessionStatus);
      if (finalSession.appointmentId) {
        await patchAppointment(finalSession.appointmentId, { appointment_status: "completed" });
      }

      // Kept for backward compatibility (e.g. if RepCommandCenter ever re-mounts in same tab)
      window.dispatchEvent(new CustomEvent("sessionCompleted", {
        detail: {
          sessionId: finalSession.sessionId,
          sessionStatus: finalSession.sessionStatus,
          appointmentId: finalSession.appointmentId,
        },
      }));

      // Trigger Office Dispatch
      if (finalSession.officeDispatchStatus !== "sent") {
        await handleOfficeDispatch(finalSession);
      }
    } catch (err) {
      /* non-fatal */
      // Don't block the rep from finishing even if sync fails
    } finally {
      setIsSyncing(false);
      onFinish();
    }
  };

  useEffect(() => {
    let reason = "";
    if (isDeferred) {
      reason = "Signature deferred - remote review";
    } else if (outcome === "repair_only") {
      reason = "Repair estimate required";
    } else if (outcome === "monitor_only") {
      reason = "Annual monitor recheck";
    } else if (!isSigned && outcome !== "no_damage") {
      reason = "Follow-up required";
    }

    if (reason && !session.followUpTasks.some(t => t.reason === reason)) {
      onUpdate(createFollowUpTask(session, reason));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // REAL-TIME REMOTE SYNC (POLLING)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isDeferred && !isSigned) {
      interval = setInterval(async () => {
        try {
          const res = await fetchSessionById(session.sessionId);
          if (res.ok) {
            const remoteSession = await res.json();
            if (remoteSession.sessionStatus === "signed" || remoteSession.signatureData.signedAt) {
              /* non-fatal */
              onUpdate({
                ...session,
                sessionStatus: remoteSession.sessionStatus,
                signatureData: remoteSession.signatureData,
                auditEvents: remoteSession.auditEvents
              });
              clearInterval(interval);
            }
          }
        } catch (e) {
          /* non-fatal */
        }
      }, 10000); // Poll every 10 seconds
    }

    return () => clearInterval(interval);
  }, [isDeferred, isSigned, session.sessionId]);

  const handleDownloadPDF = async () => {
    await downloadSummaryPDF(session);
    setExported(true);
  };
  const handleDelivery = async (method: "email" | "text") => {
    setIsSending(true);
    setError(null);

    try {
      if (method === "email") {
        // 1. Generate Forensic PDF in background
        const { getSummaryPDFBase64 } = await import("@/lib/pdf-export");
        const pdfBase64 = await getSummaryPDFBase64(session);

        // 2. Prepare recipients (Sanitize empty strings)
        const currentEmail = (session.signatureData.signerEmail || session.signatureData.summarySendRecipient || session.property.homeownerPrimaryEmail || "").trim();
        const primaryEmail = currentEmail || quickEmail.trim();
        const decisionMakerEmail = (session.buyerData.decisionMakerEmail || "").trim();

        if (!primaryEmail) throw new Error("Primary homeowner email is missing. Please add an email address to send the dossier.");

        // 3. Force-Sync to Cloud Relay (Mandatory for remote link to work)
        await syncSession({
          ...session,
          property: { ...session.property, homeownerPrimaryEmail: primaryEmail }
        });

        // 4. Update local session with email if it was missing
        if (!currentEmail && primaryEmail) {
          onUpdate({
            ...session,
            property: { ...session.property, homeownerPrimaryEmail: primaryEmail }
          });
        }

        let emailMessage = "";
        if (isDeferred) {
          emailMessage = `<p>Your property inspection at <strong>${session.property.address}</strong> is complete. Attached is the full report, photo documentation, executable unsigned agreement, and a one-page summary for your review.</p>`;
        } else if (outcome === "repair_only") {
          emailMessage = `<p>Your property inspection at <strong>${session.property.address}</strong> is complete. Attached is your repair option summary.</p><p>We have created a repair estimate task, and our team will follow up with you shortly.</p>`;
        } else if (outcome === "no_damage" || outcome === "monitor_only") {
          emailMessage = `<p>Your property inspection at <strong>${session.property.address}</strong> is complete. Attached is your documentation summary and future recheck options.</p><p>Please keep this for your records, and feel free to leave us a review or refer us to a neighbor.</p>`;
        } else {
          emailMessage = `<p>Your property inspection at <strong>${session.property.address}</strong> is complete. Attached is the full inspection report, photo evidence, executed agreement, and claim coordination checklist.</p>`;
        }

        const reviewUrl = session.reviewToken 
          ? `${window.location.origin}/review/${session.reviewToken}` 
          : null;

        const reviewButtonHtml = reviewUrl ? `
          <div style="margin: 32px 0; text-align: center;">
            <a href="${reviewUrl}" style="background-color: #6366f1; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">REVIEW & AUTHORIZE DOSSIER</a>
          </div>
        ` : '';

        // 5. Dispatch to API
        const ccList = [];
        if (decisionMakerEmail && decisionMakerEmail !== primaryEmail) {
          ccList.push(decisionMakerEmail);
        }
        
        if (outcome === "claim_review_candidate") {
          ccList.push("ecaturia@hustadcompanies.com");
          ccList.push("Marshall@hustadcompanies.com");
        } else {
          ccList.push("Dustin@hustadcompanies.com");
        }

        const response = await sendEmail({
          to: primaryEmail,
          cc: ccList.join(","),
          subject: `Hustad Forensic Dossier: ${session.property.address}`,
          pdfBase64,
          fileName: `Hustad_Dossier_${session.sessionId.slice(-6).toUpperCase()}.pdf`,
          sessionId: session.sessionId,
          html: `
            <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #0f172a; padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px;">HUSTAD RESIDENTIAL</h1>
              </div>
              <div style="padding: 32px;">
                <h2 style="font-size: 20px; color: #0f172a; margin-top: 0;">Forensic Dossier Ready</h2>
                <p>Hello,</p>
                ${emailMessage}
                
                <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; margin: 24px 0;">
                  <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Outcome:</strong> ${outcome.toUpperCase().replace(/_/g, " ")}</p>
                  <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;"><strong>ID:</strong> ${session.sessionId.toUpperCase()}</p>
                </div>

                ${reviewButtonHtml}

                <p>A full technical copy of the dossier is attached to this email for your records.</p>
                
                <p style="margin-top: 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                  This is an automated delivery from the Hustad Forensic Platform. For immediate questions, please contact your representative: <strong>${session.repName}</strong>.
                </p>
              </div>
            </div>
          `
        });

        if (!response.ok) {
          const text = await response.text();
          let msg = "Email delivery failed";
          try {
            const errJson = JSON.parse(text);
            msg = errJson.error || msg;
          } catch {
            msg = text || msg;
          }
          throw new Error(msg);
        }

        const result = await response.json();
        if (result.success) {
          setDeliverySent("email");
          onUpdate(addAuditEvent(session, "summary_delivery_success", { method: "email", recipient: primaryEmail }));
        } else {
          throw new Error(result.error || "Email delivery failed");
        }
      } else {
        // SMS DISPATCH
        const currentPhone = session.property.homeownerPrimaryMobile || "";
        const phone = (currentPhone || quickPhone.trim()).replace(/\D/g, "");

        if (!phone) throw new Error("No phone number found for this property. Please add a phone number to send the text summary.");

        // 1. Force-Sync to Cloud Relay
        await syncSession({
          ...session,
          property: { ...session.property, homeownerPrimaryMobile: phone }
        });

        // 2. Update local session with phone if it was missing
        if (!currentPhone && phone) {
          onUpdate({
            ...session,
            property: { ...session.property, homeownerPrimaryMobile: phone }
          });
        }

        const reviewUrl = session.reviewToken 
          ? `${window.location.origin}/review/${session.reviewToken}` 
          : '';

        const response = await sendSms({
          to: phone,
          sessionId: session.sessionId,
          address: session.property.address,
          outcome: session.findings.outcomeType,
          message: `Hustad Residential: Your Forensic Dossier for ${session.property.address} is ready. Review & Sign here: ${reviewUrl}`
        });

        if (!response.ok) {
          const text = await response.text();
          let msg = "SMS delivery failed";
          try {
            const errJson = JSON.parse(text);
            msg = errJson.error || msg;
          } catch {
            msg = text || msg;
          }
          throw new Error(msg);
        }

        const result = await response.json();
        if (result.success) {
          setDeliverySent("text");
          onUpdate(addAuditEvent(session, "summary_delivery_success", { method: "text", recipient: phone }));
        } else {
          throw new Error(result.error || "SMS delivery failed");
        }
      }
    } catch (err: any) {
      /* non-fatal */
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={cn("relative flex flex-col h-screen w-full overflow-hidden transition-colors duration-300", isDark ? "bg-[#060606]" : "bg-[#F7F5F1]")}>
      {isDark && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(99,102,241,0.04),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.03),transparent_60%)]" />
        </div>
      )}

      <div className="absolute top-10 left-10 z-30 hidden lg:flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className={cn("font-display font-bold text-2xl tracking-[0.1em]", isDark ? "text-[#E8EDF8]" : "text-[#1B2B4B]")}>HUSTAD</span>
          <span className={cn("text-[10px] font-mono uppercase tracking-[0.3em]", isDark ? "text-[#AABDCF]" : "text-[rgba(27,43,75,0.62)]")}>Madison Residential</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto min-h-0 px-6 md:px-10 pt-20 pb-64 text-center">
        <div className="max-w-[1400px] mx-auto space-y-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className={cn("inline-flex items-center gap-3 px-4 py-1.5 rounded-full border backdrop-blur-md w-fit mx-auto", isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-zinc-100 border-zinc-200")}>
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className={cn("text-[10px] font-mono uppercase tracking-[0.2em] pt-0.5", isDark ? "text-indigo-300" : "text-[#1D55C4]")}>
                {isSigned ? "✓ Authorization Complete" : "✓ Session Finalized"}
              </span>
            </div>
            <h1 className={cn("text-3xl md:text-5xl lg:text-7xl font-display font-medium tracking-tighter leading-[1.05]", isDark ? "text-[#E8EDF8]" : "text-[#1B2B4B]")}>
              {config.headline}
            </h1>
            <p className={cn("text-xl font-light leading-relaxed max-w-2xl mx-auto", isDark ? "text-[#AABDCF]" : "text-[rgba(27,43,75,0.85)]")}>
              {config.detail}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
            <div className="lg:col-span-7 space-y-8">
              {/* Roadmap Bento */}
              <div className={cn("p-10 rounded-[48px] backdrop-blur-3xl space-y-8 border", isDark ? "bg-white/[0.03] border-white/[0.1]" : "bg-white border-zinc-200 shadow-sm")}>
                <p className={cn("font-mono text-[10px] uppercase tracking-[0.3em]", isDark ? "text-[#AABDCF]" : "text-zinc-500")}>Operational Roadmap</p>
                <div className="space-y-8">
                  {config.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-6 group">
                      <div className={cn("w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 transition-colors", 
                        isDark 
                          ? "bg-white/5 border-white/10 group-hover:border-indigo-500/50" 
                          : "bg-zinc-50 border-zinc-200 group-hover:border-indigo-400"
                      )}>
                        <span className={cn("text-sm font-mono transition-colors", isDark ? "text-[#AABDCF] group-hover:text-[#E8EDF8]" : "text-zinc-600 group-hover:text-[#1D55C4]")}>{i + 1}</span>
                      </div>
                      <p className={cn("font-light text-base leading-relaxed pt-1.5 transition-colors", isDark ? "text-[#DDE5F5] group-hover:text-[#C2D0E4]" : "text-[#1B2B4B] group-hover:text-zinc-900")}>{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-8">
              {/* Deliverables Bento */}
              <div className={cn("p-8 rounded-[40px] backdrop-blur-3xl space-y-6 border", 
                isDark 
                  ? "bg-indigo-500/[0.03] border-indigo-500/[0.1]" 
                  : "bg-indigo-50/50 border-indigo-100 shadow-sm"
              )}>
                <p className={cn("font-mono text-[10px] uppercase tracking-[0.3em]", isDark ? "text-indigo-300" : "text-[#1D55C4]")}>Your Deliverables</p>
                <div className="space-y-4">
                  {DELIVERABLES[outcomeKey]?.map((d, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", isDark ? "bg-indigo-500/10" : "bg-indigo-100")}>
                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                      </div>
                      <p className={cn("text-sm font-light transition-colors", isDark ? "text-[#DDE5F5] group-hover:text-[#E8EDF8]" : "text-[#1B2B4B] group-hover:text-zinc-900")}>{d}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remote Co-Decision-Maker Status */}
              {isDeferred && session.reviewToken && (
                <RemoteStatusTracker 
                  token={session.reviewToken}
                  recipientEmail={session.signatureData.summarySendRecipient || session.buyerData.decisionMakerEmail}
                  recipientName={session.buyerData.decisionMakerName || session.property.homeownerPrimaryName}
                />
              )}

              {/* Delivery Matrix */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: "email", label: "Email Summary", icon: Mail },
                    { id: "text", label: "Text Summary", icon: MessageSquare }
                  ].map((opt) => {
                    const recipient = opt.id === "email" 
                      ? (session.signatureData.signerEmail || session.property.homeownerPrimaryEmail)
                      : (session.property.homeownerPrimaryMobile || "No Phone");
                    
                    return (
                      <div key={opt.id} className="space-y-2">
                        <button
                          disabled={isSending && opt.id === "email"}
                          onClick={() => handleDelivery(opt.id as any)}
                          className={cn(
                            "w-full p-6 rounded-[32px] border transition-all duration-300 flex flex-col items-center gap-3 text-center",
                            deliverySent === opt.id 
                              ? (isDark ? "bg-indigo-500/20 border-indigo-500/40" : "bg-indigo-50 border-indigo-300 shadow-sm") 
                              : (isDark ? "bg-white/[0.02] border-white/[0.05] hover:border-white/20" : "bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm"),
                            isSending && opt.id === "email" && "animate-pulse"
                          )}
                        >
                          <opt.icon className={cn("w-5 h-5", 
                            deliverySent === opt.id 
                              ? (isDark ? "text-indigo-400" : "text-[#1D55C4]") 
                              : (isDark ? "text-[#7090B0]" : "text-zinc-500")
                          )} />
                          <span className={cn("text-[10px] font-mono uppercase tracking-widest", 
                            deliverySent === opt.id 
                              ? (isDark ? "text-[#E8EDF8]" : "text-[#1D55C4]") 
                              : (isDark ? "text-[#AABDCF]" : "text-zinc-600")
                          )}>
                            {isSending && opt.id === "email" ? "Sending..." : deliverySent === opt.id ? "Sent ✓" : opt.label}
                          </span>
                        </button>
                        <p className={cn("text-[9px] font-mono truncate px-2 text-center uppercase tracking-tighter", isDark ? "text-[#3F5878]" : "text-zinc-400")}>
                          {recipient}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {/* Quick-Fix Email Terminal */}
                {!(session.signatureData.signerEmail || session.property.homeownerPrimaryEmail || session.signatureData.summarySendRecipient) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: "auto" }} 
                    className={cn("p-6 rounded-[32px] border space-y-3", isDark ? "bg-indigo-500/[0.05] border-indigo-500/20" : "bg-indigo-50/50 border-indigo-100")}
                  >
                    <p className={cn("text-[10px] font-mono uppercase tracking-widest pl-1 pt-2", isDark ? "text-indigo-300" : "text-[#1D55C4]")}>Data Gap: Homeowner Contact Required</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/50 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                          type="email"
                          placeholder="Email Address"
                          value={quickEmail}
                          onChange={(e) => setQuickEmail(e.target.value)}
                          className={cn("w-full border rounded-2xl py-3 pl-12 pr-4 outline-none transition-all text-sm", 
                            isDark 
                              ? "bg-white/[0.03] border-white/10 text-[#E8EDF8] placeholder:text-[#2D4060] focus:border-indigo-400/50" 
                              : "bg-white border-zinc-200 text-[#1B2B4B] placeholder:text-zinc-400 focus:border-indigo-400"
                          )}
                        />
                      </div>
                      <div className="relative group">
                        <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400/50 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                          type="tel"
                          placeholder="Phone Number"
                          value={quickPhone}
                          onChange={(e) => setQuickPhone(e.target.value)}
                          className={cn("w-full border rounded-2xl py-3 pl-12 pr-4 outline-none transition-all text-sm", 
                            isDark 
                              ? "bg-white/[0.03] border-white/10 text-[#E8EDF8] placeholder:text-[#2D4060] focus:border-indigo-400/50" 
                              : "bg-white border-zinc-200 text-[#1B2B4B] placeholder:text-zinc-400 focus:border-indigo-400"
                          )}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {deliverySent === "email" && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                    <p className="text-[10px] font-mono text-green-400 uppercase tracking-widest">
                      Dossier dispatched to inbox ✓
                    </p>
                  </motion.div>
                )}
                {error && (
                  <p className="text-[10px] font-mono text-rose-400 uppercase tracking-widest pl-2">
                    Error: {error}
                  </p>
                )}
              </div>

              <button 
                onClick={handleDownloadPDF}
                className={cn("w-full p-4 rounded-2xl border transition-all flex items-center justify-center gap-3 group", 
                  isDark 
                    ? "bg-white/[0.02] border-white/5 hover:bg-white/5" 
                    : "bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm"
                )}
              >
                <Download className={cn("w-4 h-4 transition-colors", isDark ? "text-[#7090B0] group-hover:text-indigo-400" : "text-zinc-500 group-hover:text-[#1D55C4]")} />
                <span className={cn("text-[10px] font-mono uppercase tracking-widest transition-colors", 
                  isDark ? "text-[#7090B0] group-hover:text-[#AABDCF]" : "text-zinc-600 group-hover:text-zinc-900"
                )}>
                  {exported ? "Summary Downloaded ✓" : "Download Summary (PDF)"}
                </span>
              </button>

              {/* Office Dispatch Status & Retry */}
              {session.officeDispatchStatus && (
                <div className={cn(
                  "p-6 rounded-[32px] border transition-all duration-300 space-y-4",
                  session.officeDispatchStatus === "sent" 
                    ? (isDark ? "bg-green-500/5 border-green-500/20" : "bg-emerald-50 border-emerald-200") 
                    : (isDark ? "bg-rose-500/5 border-rose-500/20" : "bg-rose-50 border-rose-200")
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        session.officeDispatchStatus === "sent" 
                          ? (isDark ? "bg-green-400" : "bg-emerald-500") 
                          : (isDark ? "bg-rose-400 animate-pulse" : "bg-rose-500 animate-pulse")
                      )} />
                      <p className={cn("text-[10px] font-mono uppercase tracking-[0.2em]", isDark ? "text-[#7090B0]" : "text-zinc-500")}>Office Dispatch</p>
                    </div>
                    {session.officeDispatchStatus === "sent" ? (
                      <span className={cn("text-[10px] font-mono uppercase tracking-widest", isDark ? "text-green-400" : "text-emerald-600 font-medium")}>Sent ✓</span>
                    ) : (
                      <span className={cn("text-[10px] font-mono uppercase tracking-widest", isDark ? "text-rose-400" : "text-rose-600 font-medium")}>Failed</span>
                    )}
                  </div>
                  
                  {session.officeDispatchStatus === "error" && (
                    <button
                      disabled={isDispatching}
                      onClick={() => handleOfficeDispatch(session)}
                      className={cn("w-full py-3 rounded-xl border transition-all flex items-center justify-center gap-2", 
                        isDark 
                          ? "bg-white/5 border-white/10 hover:bg-white/10" 
                          : "bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm"
                      )}
                    >
                      <RefreshCw className={cn("w-3 h-3", isDark ? "text-[#7090B0]" : "text-zinc-500", isDispatching && "animate-spin")} />
                      <span className={cn("text-[10px] font-mono uppercase tracking-[0.1em]", isDark ? "text-[#AABDCF]" : "text-zinc-700")}>Retry Dispatch</span>
                    </button>
                  )}
                  
                  {session.officeDispatchedAt && (
                    <p className={cn("text-[9px] font-mono text-center uppercase tracking-tighter", isDark ? "text-[#2D4060]" : "text-zinc-400")}>
                      Timestamp: {new Date(session.officeDispatchedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30 pointer-events-none">
        <div className={cn("absolute inset-0 pt-20", isDark ? "bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent" : "bg-gradient-to-t from-[#F7F5F1] via-[#F7F5F1]/90 to-transparent")} />
        <div className="relative max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6 pointer-events-auto">
          {!isSessionClosed && (
            <button onClick={onBack} className={cn("group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full border transition-all duration-300 shrink-0", isDark ? "bg-white/10 border-white/20 text-[#DDE5F5] hover:bg-white/20" : "bg-white border-zinc-200 text-[#1B2B4B] hover:bg-zinc-50")}>
              <ArrowLeft className={cn("w-4 h-4 group-hover:-translate-x-1 transition-transform", isDark ? "text-[#DDE5F5]" : "text-zinc-600")} />
              <span className={cn("text-sm font-display font-medium", isDark ? "text-[#E8EDF8]" : "text-[#1B2B4B]")}>Back</span>
            </button>
          )}
          <StarButton 
            onClick={isSessionClosed ? onFinish : handleFinish} 
            lightColor={isDark ? "#FAFAFA" : "#FFFFFF"}
            backgroundColor={isDark ? "#060606" : "#1D55C4"}
            className={cn(
              "flex-1 rounded-full transition-transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
              isSessionClosed ? "max-w-xl mx-auto" : "max-w-md",
              isDark ? "shadow-[0_20px_60px_rgba(99,102,241,0.2)]" : "shadow-sm"
            )} 
            disabled={isSyncing}
          >
            <div className="flex items-center gap-4">
              {isSyncing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-lg font-display font-medium tracking-wide">Syncing…</span>
                </>
              ) : (
                <>
                  <span className="text-lg font-display font-medium tracking-wide">
                    {isSessionClosed ? "Return to Inspections Dashboard" : config.finishLabel}
                  </span>
                  <ChevronRight className={cn("w-5 h-5", isDark ? "text-[#DDE5F5]" : "text-white")} />
                </>
              )}
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}
