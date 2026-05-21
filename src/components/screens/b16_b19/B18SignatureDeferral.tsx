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

interface Props {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
}

export function B18SignatureDeferral({ session, onUpdate, onNext, onBack }: Props) {
  const [mode, setMode] = useState<"sign" | "defer" | null>(null);
  const [signerName, setSignerName] = useState(session.signatureData.signerName || session.property.homeownerPrimaryName);
  const [signerEmail, setSignerEmail] = useState(session.signatureData.signerEmail || session.property.homeownerPrimaryEmail);
  const [deferEmail, setDeferEmail] = useState(session.signatureData.summarySendRecipient || session.buyerData.decisionMakerEmail);
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
        signatureData: { ...updated.signatureData, summarySendRecipient: deferEmail },
      };
      updated = addAuditEvent(updated, "summary_sent", { recipient: deferEmail, token: updated.reviewToken });
      
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
    <div className="relative flex flex-col min-h-screen w-full bg-[#060606]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <ElegantShape delay={0.2} width={600} height={140} rotate={12} gradient="from-indigo-500/[0.12]" className="left-[-5%] top-[10%]" />
      </div>

      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-[#E8EDF8] text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-10 pt-12 pb-40 text-center min-h-0">
        <div className="max-w-4xl mx-auto space-y-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md w-fit mx-auto">
              <PenTool className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-[0.2em] pt-0.5">Authorization</span>
            </div>
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[#E8EDF8] tracking-tight leading-[1.05]">
              Ready to authorize,
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-indigo-300">or send for review?</span>
            </h1>
          </motion.div>

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
                    ? "bg-indigo-500/20 border-indigo-500/40" 
                    : "bg-white/[0.02] border-white/[0.05] hover:border-white/20"
                )}
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", mode === opt.id ? "bg-indigo-500 text-[#E8EDF8]" : "bg-white/5 text-[#8BA5C5]")}>
                  <opt.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className={cn("font-display font-medium text-lg", mode === opt.id ? "text-[#E8EDF8]" : "text-[#DDE5F5]")}>{opt.label}</p>
                  <p className="text-xs text-[#8BA5C5] font-light mt-1">{opt.detail}</p>
                </div>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {mode === "sign" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-widest pl-2">Signer Name</p>
                    <input className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 px-6 text-[#E8EDF8] placeholder:text-[#7090B0] outline-none focus:border-indigo-500/50" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-widest pl-2">Signer Email</p>
                    <input className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 px-6 text-[#E8EDF8] placeholder:text-[#7090B0] outline-none focus:border-indigo-500/50" type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-widest pl-2">Digital Signature</p>
                  <div 
                    onClick={() => setSigned(true)}
                    className={cn(
                      "w-full h-[124px] rounded-[32px] border flex items-center justify-center transition-all cursor-pointer",
                      signed ? "bg-white/10 border-indigo-500/50" : "bg-white/[0.02] border-dashed border-white/10 hover:bg-white/[0.05]"
                    )}
                  >
                    {signed ? (
                      <p className="text-3xl font-display italic text-[#DDE5F5] drop-shadow-lg tracking-wider">{signerName || "Authorized"}</p>
                    ) : (
                      <p className="text-[10px] font-mono text-[#7090B0] uppercase tracking-[0.2em]">Tap to Sign</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {mode === "defer" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-md mx-auto text-left space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-widest pl-2">Recipient Email</p>
                  <input className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 px-6 text-[#E8EDF8] placeholder:text-[#7090B0] outline-none focus:border-indigo-500/50" type="email" value={deferEmail} onChange={(e) => setDeferEmail(e.target.value)} placeholder="Decision maker's email" />
                </div>
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-3">
                  <Info className="w-4 h-4 text-indigo-400 mt-1" />
                  <p className="text-[10px] font-mono text-[#8BA5C5] uppercase tracking-widest leading-relaxed">System will auto-generate a follow-up task for coordination.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent pt-20" />
        <div className="relative max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6 pointer-events-auto">
          <button onClick={onBack} className="group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 shrink-0">
            <ArrowLeft className="w-4 h-4 text-[#DDE5F5] group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-[#E8EDF8]">Back</span>
          </button>
          <StarButton 
            onClick={handleSubmit} 
            lightColor="#FAFAFA" 
            backgroundColor="#060606" 
            className="flex-1 h-14 md:h-20 rounded-full shadow-[0_20px_60px_rgba(99,102,241,0.2)] active:scale-95 transition-all group"
          >
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">
                {mode === "sign" ? "Submit Authorization" : mode === "defer" ? "Send for Review" : "Continue"}
              </span>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}
