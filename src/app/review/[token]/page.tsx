"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import type { SessionState } from "@/types/session";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  FileText, 
  PenTool, 
  CheckCircle2, 
  AlertTriangle,
  Download,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { cn } from "@/lib/utils";

export default function RemoteReviewPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const sigPad = useRef<SignatureCanvas>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/session?token=${token}`);
        
        if (res.status === 409) {
          const data = await res.json();
          setSession(data.session);
          setSuccess(true);
          return;
        }

        if (res.status === 410) {
          throw new Error("This review link has expired for security reasons. Please contact your Hustad representative for a fresh link.");
        }

        if (!res.ok) throw new Error("This review link is invalid or has been revoked.");
        
        const data = await res.json();
        setSession(data);
        setSignerName(data.property.homeownerPrimaryName || "");
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [token]);

  const handleSubmit = async () => {
    if (!sigPad.current || sigPad.current.isEmpty()) {
      alert("Please provide your signature to authorize.");
      return;
    }
    if (!signerName.trim()) {
      alert("Please enter your full name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const signatureImage = sigPad.current.toDataURL();
      const now = new Date().toISOString();
      
      const updatedSession: SessionState = {
        ...session!,
        sessionStatus: "signed",
        signatureData: {
          ...session!.signatureData,
          signerName,
          signatureImage,
          signedAt: now
        },
        auditEvents: [
          ...session!.auditEvents,
          {
            eventName: "remote_signature_submitted",
            actorId: "homeowner",
            occurredAt: now,
            metadata: { method: "remote_link" }
          }
        ]
      };

      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSession)
      });

      if (!res.ok) throw new Error("Failed to submit authorization.");

      // DISPATCH CONFIRMATIONS
      try {
        const { getSummaryPDFBase64 } = await import("@/lib/pdf-export");
        const pdfBase64 = await getSummaryPDFBase64(updatedSession);
        
        // 1. Homeowner Confirmation
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: updatedSession.property.homeownerPrimaryEmail,
            subject: `Hustad Authorization Confirmed: ${updatedSession.property.address}`,
            pdfBase64,
            fileName: `Signed_Hustad_Dossier_${updatedSession.sessionId.slice(-6).toUpperCase()}.pdf`,
            sessionId: updatedSession.sessionId,
            html: `
              <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #0f172a; padding: 24px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px;">HUSTAD RESIDENTIAL</h1>
                </div>
                <div style="padding: 32px;">
                  <h2 style="color: #6366f1; margin: 0;">Authorization Confirmed</h2>
                  <p>Hello ${signerName},</p>
                  <p>Your digital authorization for the property at <strong>${updatedSession.property.address}</strong> has been successfully received and securely logged.</p>
                  
                  <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; margin: 24px 0;">
                    <p style="margin: 0; font-size: 14px;"><strong>Status:</strong> AUTHORIZED</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Timestamp:</strong> ${new Date(now).toLocaleString()}</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Outcome:</strong> ${updatedSession.findings.outcomeType?.toUpperCase().replace(/_/g, ' ')}</p>
                  </div>

                  <p>A finalized technical copy of your Forensic Dossier, including your digital signature, is attached for your records.</p>
                  <p>Hustad Residential will now coordinate with the next steps of your restoration roadmap.</p>
                </div>
              </div>
            `
          })
        });

        // 2. Rep Notification
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "jeff@hustadcompanies.com", // Rep email
            subject: `ALERT: Remote Signing Complete - ${updatedSession.property.address}`,
            pdfBase64,
            fileName: `Signed_Dossier_${updatedSession.sessionId.slice(-6).toUpperCase()}.pdf`,
            sessionId: updatedSession.sessionId,
            html: `
              <div style="font-family: sans-serif; padding: 24px;">
                <h2 style="color: #0f172a;">Remote Signing Alert</h2>
                <p>Rep: <strong>${updatedSession.repName}</strong>,</p>
                <p>Homeowner <strong>${signerName}</strong> has just authorized the dossier for <strong>${updatedSession.property.address}</strong> remotely.</p>
                <ul>
                  <li><strong>Session ID:</strong> ${updatedSession.sessionId}</li>
                  <li><strong>Outcome:</strong> ${updatedSession.findings.outcomeType}</li>
                  <li><strong>Timestamp:</strong> ${new Date(now).toLocaleString()}</li>
                </ul>
                <p>The signed PDF is attached. This session is now closed on the portal.</p>
              </div>
            `
          })
        });

        // 3. Final Log Update
        const finalSession = {
          ...updatedSession,
          auditEvents: [
            ...updatedSession.auditEvents,
            {
              eventName: "remote_authorization_confirmed",
              actorId: "system",
              occurredAt: new Date().toISOString(),
              metadata: { homeownerEmail: updatedSession.property.homeownerPrimaryEmail, repAlerted: true }
            }
          ]
        };
        
        await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalSession)
        });

        setSession(finalSession);
      } catch (confirmErr) {
        console.error("Confirmation dispatch failed:", confirmErr);
      }
      
      setSuccess(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    const { downloadSummaryPDF } = await import("@/lib/pdf-export");
    await downloadSummaryPDF(session!);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#060606]">
      <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-indigo-400 font-mono text-sm uppercase tracking-widest">
        Authenticating Secure Link...
      </motion.div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#060606] px-10 text-center">
      <AlertTriangle className="w-12 h-12 text-rose-500 mb-6" />
      <h1 className="text-2xl font-display font-medium text-white mb-2">Access Denied</h1>
      <p className="text-white/50 font-light max-w-sm">{error}</p>
    </div>
  );

  if (success) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#060606] px-10 text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-20 h-20 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mb-8">
        <CheckCircle2 className="w-10 h-10 text-indigo-400" />
      </motion.div>
      <h1 className="text-4xl font-display font-medium text-white mb-4 tracking-tight">Authorization Complete</h1>
      <p className="text-white/60 font-light max-w-md leading-relaxed mb-10">
        Thank you. Your digital authorization has been securely transmitted to Hustad Residential. A finalized copy of your Forensic Dossier is being sent to your inbox.
      </p>
      <div className="w-full max-w-xs p-4 rounded-2xl bg-white/[0.03] border border-white/5 font-mono text-[10px] text-white/40 uppercase tracking-widest mb-6">
        Transaction ID: {session?.sessionId?.toUpperCase()}
      </div>
      <button 
        onClick={handleDownload}
        className="px-8 py-4 rounded-full bg-indigo-500 text-white font-display font-medium text-sm hover:bg-indigo-600 transition-all active:scale-95 flex items-center gap-3"
      >
        <Download className="w-4 h-4" />
        <span>Download Signed Dossier</span>
      </button>
    </div>
  );

  const outcome = session!.findings.outcomeType || "no_damage";
  const address = session!.property.address;

  return (
    <div className="relative min-h-screen bg-[#060606] text-white font-sans selection:bg-indigo-500/30 overflow-y-auto">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-500/10 to-transparent" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-lg mx-auto px-6 pt-12 pb-24 space-y-10">
        {/* Header */}
        <header className="space-y-6">
          <div className="flex items-baseline gap-2 justify-center">
            <span className="font-display font-bold text-white text-xl tracking-[0.1em]">HUSTAD</span>
            <span className="text-[9px] font-mono text-white/50 uppercase tracking-[0.3em]">Residential</span>
          </div>
          
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-display font-medium tracking-tight">Review & Authorize</h1>
            <p className="text-white/50 font-light text-sm">{address?.toUpperCase()}</p>
          </div>
        </header>

        {/* Executive Summary Card */}
        <section className="p-8 rounded-[40px] bg-white/[0.03] border border-white/[0.08] backdrop-blur-3xl space-y-8">
          <div className="flex items-center gap-3 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 w-fit">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest pt-0.5">Forensic Audit Outcome</span>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-display font-medium leading-none tracking-tighter">
              {outcome.replace(/_/g, " ").toUpperCase()}
            </h2>
            <p className="text-sm text-white/70 font-light leading-relaxed">
              {outcome === "claim_review_candidate" || outcome === "full_restoration_candidate" 
                ? "Our forensic site audit and NWS meteorological validation support a comprehensive restoration package for this property."
                : outcome === "repair_only"
                ? "A targeted restoration plan has been authorized to preserve the long-term integrity of your property's exterior system."
                : "A complete forensic baseline has been established for your property. No storm-related damage was identified during this audit."}
            </p>
          </div>

          <div className="pt-4 border-t border-white/5 flex gap-4">
            <button 
              onClick={handleDownload}
              className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-3 group hover:bg-white/10 transition-all active:scale-95"
            >
              <Download className="w-4 h-4 text-white/50 group-hover:text-indigo-400 transition-colors" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/60">View Full Dossier</span>
            </button>
          </div>
        </section>

        {/* Operational Roadmap */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-3 py-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest pt-0.5">Operational Roadmap</span>
          </div>
          
          <div className="space-y-4">
            {[
              { id: 1, text: "Secure digital authorization." },
              { id: 2, text: "Hustad coordinates with carrier." },
              { id: 3, text: "Production confirms scheduling." }
            ].map((step) => (
              <div key={step.id} className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-mono text-indigo-400">
                  {step.id}
                </div>
                <span className="text-sm text-white/60 font-light">{step.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Signature Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-3 py-1">
            <PenTool className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest pt-0.5">Digital Authorization</span>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-2">Full Legal Name</label>
              <input 
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-5 px-6 text-white placeholder:text-white/20 outline-none focus:border-indigo-500/50 transition-all"
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-2">Authorized Signature</label>
              <div className="relative h-48 bg-white/[0.02] border border-dashed border-white/10 rounded-[32px] overflow-hidden group hover:border-white/20 transition-all">
                <SignatureCanvas 
                  ref={sigPad}
                  penColor="white"
                  canvasProps={{ className: "w-full h-full cursor-crosshair" }}
                />
                <button 
                  onClick={() => sigPad.current?.clear()}
                  className="absolute bottom-4 right-4 text-[9px] font-mono text-white/30 hover:text-white/60 uppercase tracking-widest"
                >
                  Clear Pad
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Submit Button */}
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={cn(
            "w-full py-6 rounded-full bg-white text-black font-display font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-3",
            isSubmitting && "opacity-50 pointer-events-none"
          )}
        >
          {isSubmitting ? (
            <span className="animate-pulse">Authorizing...</span>
          ) : (
            <>
              <span>Submit Authorization</span>
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>

        <footer className="pt-10 text-center">
          <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.4em] leading-relaxed">
            Hustad Companies Inc. // Forensic Restoration Division
            <br />
            Secure Digital Instrument
          </p>
        </footer>
      </main>
    </div>
  );
}
