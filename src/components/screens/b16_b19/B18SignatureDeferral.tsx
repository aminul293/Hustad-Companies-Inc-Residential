"use client";

import { useState } from "react";
import type { SessionState } from "@/types/session";
import { ElegantShape } from "@/components/ui/shape-landing-hero";
import { StarButton } from "@/components/ui/star-button";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenTool,
  Mail,
  Info,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { submitSession, addAuditEvent } from "@/lib/session";
import { syncSession } from "@/lib/api";
import { useTheme } from "@/components/ThemeProvider";

interface Props {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
}

export function B18SignatureDeferral({ session, onUpdate, onNext, onBack }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark" || theme === "high-contrast";
  const [mode, setMode] = useState<"sign" | "defer" | null>(
    session.sessionStatus === "authorization_pending" ? "sign" :
    session.sessionStatus === "deferred" ? "defer" : null
  );
  const [signerName, setSignerName] = useState(session.signatureData.signerName || session.property.homeownerPrimaryName);
  const [signerEmail, setSignerEmail] = useState(session.signatureData.signerEmail || session.property.homeownerPrimaryEmail);
  const [deferEmail, setDeferEmail] = useState(session.signatureData.summarySendRecipient || session.buyerData.decisionMakerEmail);
  const [deferReason, setDeferReason] = useState(session.signatureData.deferralReason || "");
  const [deferFollowUpDate, setDeferFollowUpDate] = useState(session.signatureData.deferralFollowUpDate || "");
  const [deferFollowUpTime, setDeferFollowUpTime] = useState(session.signatureData.deferralFollowUpTime || "");
  const [signed, setSigned] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    const e: Record<string, string> = {};
    if (mode === "sign") {
      if (!signerName.trim()) e.name = "Required.";
      if (!signerEmail.trim()) e.email = "Required.";
      if (!signed) e.sig = "Signature required.";
    } else if (mode === "defer") {
      if (!deferEmail.trim()) e.deferEmail = "Delivery email required.";
      if (!deferReason) e.deferReason = "Please select a reason.";
      if (!deferFollowUpDate) e.deferDate = "Follow-up date required.";
      if (!deferFollowUpTime) e.deferTime = "Follow-up time required.";
    } else {
      e.mode = "Choose a path.";
    }
    if (Object.keys(e).length) { setErrors(e); return; }

    let updated: SessionState = { ...session };
    
    if (mode === "sign") {
      updated = {
        ...updated,
        signatureData: {
          ...updated.signatureData,
          signerName,
          signerEmail,
          signatureImage: "placeholder_sig",
          signedAt: new Date().toISOString()
        },
      };
      updated = submitSession(updated);
    } else {
      // REMOTE REVIEW FLOW
      const { generateReviewToken } = await import("@/lib/session");
      updated = generateReviewToken(updated);
      updated = {
        ...updated,
        sessionStatus: "deferred",
        signatureData: { 
          ...updated.signatureData, 
          summarySendRecipient: deferEmail,
          deferralReason: deferReason,
          deferralFollowUpDate: deferFollowUpDate,
          deferralFollowUpTime: deferFollowUpTime
        },
      };
      updated = addAuditEvent(updated, "summary_sent", { recipient: deferEmail, token: updated.reviewToken, reason: deferReason, followUp: `${deferFollowUpDate} ${deferFollowUpTime}` });
      
      // Stage for Cloud Relay
      try {
        await syncSession(updated);
      } catch (err) {
        /* non-fatal */
      }
    }
    onUpdate(updated);
    onNext();
  };

  return (
    <div className={cn("relative flex flex-col h-screen w-full overflow-hidden transition-colors duration-300", isDark ? "bg-[#060606]" : "bg-[#F7F5F1]")}>
      {isDark && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <ElegantShape delay={0.2} width={600} height={140} rotate={12} gradient="from-indigo-500/[0.12]" className="left-[-5%] top-[10%]" />
        </div>
      )}

      <div className="absolute top-10 left-10 z-30 hidden lg:flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className={cn("font-display font-bold text-2xl tracking-[0.1em]", isDark ? "text-[#E8EDF8]" : "text-[#1B2B4B]")}>HUSTAD</span>
          <span className={cn("text-[10px] font-mono uppercase tracking-[0.3em]", isDark ? "text-[#AABDCF]" : "text-[rgba(27,43,75,0.62)]")}>Madison Residential</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-10 pt-12 pb-40 text-center min-h-0">
        <div className="max-w-4xl mx-auto space-y-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className={cn("inline-flex items-center gap-3 px-4 py-1.5 rounded-full border backdrop-blur-md w-fit mx-auto", isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-zinc-100 border-zinc-200")}>
              <PenTool className="w-3.5 h-3.5 text-indigo-400" />
              <span className={cn("text-[10px] font-mono uppercase tracking-[0.2em] pt-0.5", isDark ? "text-indigo-300" : "text-[#1D55C4]")}>Authorization</span>
            </div>
            <h1 className={cn("text-3xl md:text-6xl lg:text-8xl font-display font-medium tracking-tight leading-[1.05]", isDark ? "text-[#E8EDF8]" : "text-[#1B2B4B]")}>
              {mode === "sign" ? "Authorization" : mode === "defer" ? "Setup Remote Review" : "Ready to authorize,"}
              <br />
              <span className={cn("bg-clip-text text-transparent bg-gradient-to-r", isDark ? "from-indigo-300 via-white to-indigo-300" : "from-[#1D55C4] to-[#1540A0]")}>
                {mode === "sign" ? "Sign today" : mode === "defer" ? "Share with a co-decision-maker" : "or send for review?"}
              </span>
            </h1>
          </motion.div>

          {mode === null && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {[
              { id: "sign" as const, label: "Authorize Now", detail: "Sign today and confirm next steps.", icon: PenTool },
              { id: "defer" as const, label: "Send for Review", detail: "Share with a co-decision-maker first.", icon: Mail }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setMode(opt.id)}
                className={cn(
                  "p-8 rounded-[40px] border transition-all duration-300 flex flex-col items-center gap-4 text-center",
                  mode === opt.id 
                    ? (isDark ? "bg-indigo-500/20 border-indigo-500/40" : "bg-indigo-50 border-indigo-300 shadow-sm") 
                    : (isDark ? "bg-white/[0.02] border-white/[0.05] hover:border-white/20" : "bg-white border-zinc-200 hover:bg-zinc-50")
                )}
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", 
                  mode === opt.id 
                    ? (isDark ? "bg-indigo-500 text-[#E8EDF8]" : "bg-indigo-600 text-white") 
                    : (isDark ? "bg-white/5 text-[#8BA5C5]" : "bg-zinc-100 text-zinc-500")
                )}>
                  <opt.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className={cn("font-display font-medium text-lg", 
                    mode === opt.id 
                      ? (isDark ? "text-[#E8EDF8]" : "text-[#1D55C4]") 
                      : (isDark ? "text-[#DDE5F5]" : "text-[#1B2B4B]")
                  )}>{opt.label}</p>
                  <p className={cn("text-xs font-light mt-1", isDark ? "text-[#8BA5C5]" : "text-[rgba(27,43,75,0.62)]")}>{opt.detail}</p>
                </div>
              </button>
            ))}
          </div>
          )}

          <AnimatePresence mode="wait">
            {mode === "sign" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className={cn("text-[10px] font-mono uppercase tracking-widest pl-2", isDark ? "text-[#AABDCF]" : "text-zinc-500")}>Signer Name</p>
                    <input className={cn("w-full border rounded-2xl py-4 px-6 outline-none transition-all", 
                      isDark 
                        ? "bg-white/[0.04] border-white/[0.1] text-[#E8EDF8] placeholder:text-[#7090B0] focus:border-indigo-500/50" 
                        : "bg-white border-zinc-200 text-[#1B2B4B] placeholder:text-zinc-400 focus:border-indigo-400"
                    )} value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <p className={cn("text-[10px] font-mono uppercase tracking-widest pl-2", isDark ? "text-[#AABDCF]" : "text-zinc-500")}>Signer Email</p>
                    <input className={cn("w-full border rounded-2xl py-4 px-6 outline-none transition-all", 
                      isDark 
                        ? "bg-white/[0.04] border-white/[0.1] text-[#E8EDF8] placeholder:text-[#7090B0] focus:border-indigo-500/50" 
                        : "bg-white border-zinc-200 text-[#1B2B4B] placeholder:text-zinc-400 focus:border-indigo-400"
                    )} type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className={cn("text-[10px] font-mono uppercase tracking-widest pl-2", isDark ? "text-[#AABDCF]" : "text-zinc-500")}>Digital Signature</p>
                  <div 
                    onClick={() => setSigned(true)}
                    className={cn(
                      "w-full h-[124px] rounded-[32px] border flex items-center justify-center transition-all cursor-pointer",
                      signed 
                        ? (isDark ? "bg-white/10 border-indigo-500/50" : "bg-indigo-50 border-indigo-300") 
                        : (isDark ? "bg-white/[0.02] border-dashed border-white/10 hover:bg-white/[0.05]" : "bg-white border-dashed border-zinc-300 hover:bg-zinc-50")
                    )}
                  >
                    {signed ? (
                      <p className={cn("text-3xl font-display italic drop-shadow-lg tracking-wider", isDark ? "text-[#DDE5F5]" : "text-[#1D55C4]")}>{signerName || "Authorized"}</p>
                    ) : (
                      <p className={cn("text-[10px] font-mono uppercase tracking-[0.2em]", isDark ? "text-[#7090B0]" : "text-zinc-400")}>Tap to Sign</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {mode === "defer" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-md mx-auto text-left space-y-4">
                <div className="space-y-2">
                  <p className={cn("text-[10px] font-mono uppercase tracking-widest pl-2", isDark ? "text-[#AABDCF]" : "text-zinc-500")}>Recipient Email</p>
                  <input className={cn("w-full border rounded-2xl py-4 px-6 outline-none transition-all", 
                    isDark 
                      ? (errors.deferEmail ? "border-rose-500/50" : "border-white/[0.1]") + " bg-white/[0.04] text-[#E8EDF8] placeholder:text-[#7090B0] focus:border-indigo-500/50"
                      : (errors.deferEmail ? "border-rose-500" : "border-zinc-200") + " bg-white text-[#1B2B4B] placeholder:text-zinc-400 focus:border-indigo-400"
                  )} type="email" value={deferEmail} onChange={(e) => { setDeferEmail(e.target.value); setErrors({...errors, deferEmail: ""}); }} placeholder="Decision maker's email" />
                  {errors.deferEmail && <p className="text-rose-500 text-xs pl-2">{errors.deferEmail}</p>}
                </div>
                
                <div className="space-y-2">
                  <p className={cn("text-[10px] font-mono uppercase tracking-widest pl-2", isDark ? "text-[#AABDCF]" : "text-zinc-500")}>What needs to be reviewed?</p>
                  <select 
                    value={deferReason} 
                    onChange={(e) => setDeferReason(e.target.value)}
                    className={cn("w-full border rounded-2xl py-4 px-6 outline-none appearance-none transition-all", 
                      isDark 
                        ? (errors.deferReason ? "border-rose-500/50" : "border-white/[0.1]") + " bg-white/[0.04] text-[#E8EDF8] focus:border-indigo-500/50"
                        : (errors.deferReason ? "border-rose-500" : "border-zinc-200") + " bg-white text-[#1B2B4B] focus:border-indigo-400"
                    )}
                  >
                    <option value="" disabled className={isDark ? "bg-[#060606] text-[#E8EDF8]" : "bg-white text-[#1B2B4B]"}>Select reason...</option>
                    <option value="spouse_coowner" className={isDark ? "bg-[#060606] text-[#E8EDF8]" : "bg-white text-[#1B2B4B]"}>Spouse/Co-owner review</option>
                    <option value="deductible" className={isDark ? "bg-[#060606] text-[#E8EDF8]" : "bg-white text-[#1B2B4B]"}>Deductible question</option>
                    <option value="compare_options" className={isDark ? "bg-[#060606] text-[#E8EDF8]" : "bg-white text-[#1B2B4B]"}>Compare repair vs claim review</option>
                    <option value="timing" className={isDark ? "bg-[#060606] text-[#E8EDF8]" : "bg-white text-[#1B2B4B]"}>Timing constraints</option>
                    <option value="agreement_review" className={isDark ? "bg-[#060606] text-[#E8EDF8]" : "bg-white text-[#1B2B4B]"}>Agreement review</option>
                    <option value="other" className={isDark ? "bg-[#060606] text-[#E8EDF8]" : "bg-white text-[#1B2B4B]"}>Other</option>
                  </select>
                  {errors.deferReason && <p className="text-rose-500 text-xs pl-2">{errors.deferReason}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className={cn("text-[10px] font-mono uppercase tracking-widest pl-2", isDark ? "text-[#AABDCF]" : "text-zinc-500")}>Follow-up Date</p>
                    <input 
                      type="date" 
                      value={deferFollowUpDate} 
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      onFocus={(e) => e.currentTarget.showPicker?.()}
                      onChange={(e) => { setDeferFollowUpDate(e.target.value); setErrors({...errors, deferDate: ""}); }}
                      className={cn("w-full border rounded-2xl py-4 px-6 outline-none transition-all cursor-pointer", 
                        isDark 
                          ? (errors.deferDate ? "border-rose-500/50" : "border-white/[0.1]") + " bg-white/[0.04] text-[#E8EDF8] focus:border-indigo-500/50"
                          : (errors.deferDate ? "border-rose-500" : "border-zinc-200") + " bg-white text-[#1B2B4B] focus:border-indigo-400"
                      )}
                    />
                    {errors.deferDate && <p className="text-rose-500 text-xs pl-2">{errors.deferDate}</p>}
                  </div>
                  <div className="space-y-2">
                    <p className={cn("text-[10px] font-mono uppercase tracking-widest pl-2", isDark ? "text-[#AABDCF]" : "text-zinc-500")}>Time</p>
                    <input 
                      type="time" 
                      value={deferFollowUpTime} 
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      onFocus={(e) => e.currentTarget.showPicker?.()}
                      onChange={(e) => { setDeferFollowUpTime(e.target.value); setErrors({...errors, deferTime: ""}); }}
                      className={cn("w-full border rounded-2xl py-4 px-6 outline-none transition-all cursor-pointer", 
                        isDark 
                          ? (errors.deferTime ? "border-rose-500/50" : "border-white/[0.1]") + " bg-white/[0.04] text-[#E8EDF8] focus:border-indigo-500/50"
                          : (errors.deferTime ? "border-rose-500" : "border-zinc-200") + " bg-white text-[#1B2B4B] focus:border-indigo-400"
                      )}
                    />
                    {errors.deferTime && <p className="text-rose-500 text-xs pl-2">{errors.deferTime}</p>}
                  </div>
                </div>

                <div className={cn("p-4 rounded-2xl border flex items-start gap-3 mt-4", isDark ? "bg-indigo-500/5 border-indigo-500/10" : "bg-indigo-50 border-indigo-200")}>
                  <Info className="w-4 h-4 text-indigo-400 mt-1 shrink-0" />
                  <p className={cn("text-[10px] font-mono uppercase tracking-widest leading-relaxed", isDark ? "text-[#8BA5C5]" : "text-[#1D55C4]")}>System will auto-generate a follow-up task for coordination.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30 pointer-events-none">
        <div className={cn("absolute inset-0 pt-20", isDark ? "bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent" : "bg-gradient-to-t from-[#F7F5F1] via-[#F7F5F1]/90 to-transparent")} />
        <div className="relative max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6 pointer-events-auto">
          <button onClick={onBack} className={cn("group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full border transition-all duration-300 shrink-0", isDark ? "bg-white/10 border-white/20 text-[#DDE5F5] hover:bg-white/20" : "bg-white border-zinc-200 text-[#1B2B4B] hover:bg-zinc-50")}>
            <ArrowLeft className={cn("w-4 h-4 group-hover:-translate-x-1 transition-transform", isDark ? "text-[#DDE5F5]" : "text-zinc-600")} />
            <span className={cn("text-sm font-display font-medium", isDark ? "text-[#E8EDF8]" : "text-[#1B2B4B]")}>Back</span>
          </button>
          <StarButton 
            onClick={handleSubmit} 
            lightColor={isDark ? "#FAFAFA" : "#FFFFFF"}
            backgroundColor={isDark ? "#060606" : "#1D55C4"}
            className={cn("flex-1 h-14 md:h-20 rounded-full transition-all group", isDark ? "shadow-[0_20px_60px_rgba(99,102,241,0.2)] active:scale-95" : "active:scale-95 shadow-sm")}
          >
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">
                {mode === "sign" ? "Submit Authorization" : mode === "defer" ? "Continue to Next Steps" : "Continue"}
              </span>
              <ChevronRight className={cn("w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform shrink-0", isDark ? "text-indigo-400" : "text-white")} />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}
