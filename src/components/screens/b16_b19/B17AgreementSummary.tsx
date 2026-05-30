"use client";

import { useState } from "react";
import type { SessionState } from "@/types/session";
import { StarButton } from "@/components/ui/star-button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  AlertTriangle,
  FileText,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMissingRequiredShots } from "@/lib/inspectionShotList";
import { CLAIM_TERMS, REPAIR_TERMS, WISCONSIN_CLAIM_NOTICE, AGREEMENT_SECTIONS } from "./constants";

interface Props {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
}

export function B17AgreementSummary({ session, onUpdate, onNext, onBack }: Props) {
  const [claimRelated, setClaimRelated] = useState<boolean | null>(session.pathData.claimRelatedWork);
  const [acks, setAcks] = useState<boolean[]>([
    session.pathData.agreementAcknowledged,
    session.pathData.agreementAcknowledged,
    session.pathData.agreementAcknowledged,
    session.pathData.agreementAcknowledged,
    session.pathData.agreementAcknowledged
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPhotoWarning, setShowPhotoWarning] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);

  const missingShots = getMissingRequiredShots(session.photos || []);
  const outcome = session.findings.outcomeType;
  const isClaimPath = outcome === "claim_review_candidate" || session.pathData.selectedPath === "claim_review";

  const [isSubmitting, setIsSubmitting] = useState(false);

  const createCPOpportunity = async (stage: "Pending" | "Accepted") => {
    if (!session.centerpointId) {
      console.warn("No centerpointId in session to create opportunity.");
      return;
    }
    try {
      setIsSubmitting(true);
      let domain = "Sales";
      let type: string | undefined = undefined;
      let opportunityType: string | undefined = undefined;

      if (outcome === "repair_only") {
        opportunityType = "Service";
      } else if (outcome === "claim_review_candidate") {
        opportunityType = "Hail/Wind Claim";
      } else if (outcome === "full_restoration_candidate") {
        opportunityType = "Roof Replacement";
      }

      const res = await fetch("/api/centerpoint/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centerpointId: session.centerpointId,
          targetStage: stage,
          domain,
          type,
          opportunityType,
        }),
      });
      if (!res.ok) {
        console.error("Opportunity creation failed:", await res.text());
      }
    } catch (err) {
      console.error("Opportunity creation error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = async () => {
    const e: Record<string, string> = {};
    if (isClaimPath && claimRelated === null) e.claim = "Please confirm whether this work is related to an insurance claim.";
    const allAcknowledged = acks.every(a => a);
    if (!allAcknowledged) e.ack = "Please check all acknowledgements to proceed.";
    
    // Photo requirement guard
    if (!showPhotoWarning && missingShots.length > 0) {
      setShowPhotoWarning(true);
      return;
    }

    if (Object.keys(e).length) { setErrors(e); return; }

    await createCPOpportunity("Accepted");

    const updated: SessionState = {
      ...session,
      sessionStatus: "authorization_pending",
      pathData: {
        ...session.pathData,
        claimRelatedWork: claimRelated,
        agreementAcknowledged: allAcknowledged,
      },
    };
    onUpdate(updated);
    onNext();
  };

  const handleSendForReview = async () => {
    const e: Record<string, string> = {};
    const allAcknowledged = acks.every(a => a);
    if (!allAcknowledged) e.ack = "Please check all acknowledgements to proceed.";
    if (Object.keys(e).length) { setErrors(e); return; }

    await createCPOpportunity("Pending");

    const updated: SessionState = {
      ...session,
      sessionStatus: "deferred",
      pathData: {
        ...session.pathData,
        agreementAcknowledged: allAcknowledged,
      },
    };
    onUpdate(updated);
    onNext();
  };

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(99,102,241,0.04),transparent_70%)]" />
      </div>

      <div className="absolute top-10 left-10 z-30 hidden lg:flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-[#E8EDF8] text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-10 pt-20 pb-56 text-center min-h-0">
        <div className="max-w-4xl mx-auto space-y-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md w-fit mx-auto">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-[0.2em] pt-0.5">Insurance Contingency Agreement Review</span>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-display font-medium text-[#E8EDF8] tracking-tight leading-[1.05]">
              Review what you are authorizing
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-indigo-300">before you sign.</span>
            </h1>
          </motion.div>

          <AnimatePresence>
            {showPhotoWarning && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl mx-auto p-8 rounded-[40px] bg-rose-500/10 border border-rose-500/30 backdrop-blur-3xl space-y-6 text-left"
              >
                <div className="flex items-center gap-4 text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                  <h3 className="text-xl font-display font-medium">Incomplete Documentation</h3>
                </div>
                <p className="text-sm text-rose-200/70 font-light leading-relaxed">
                  You are missing <span className="font-bold text-rose-300">{missingShots.length} required photos</span> for this forensic inspection. 
                  The dossier will be flagged as &quot;Partial Evidence&quot; in the command center.
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => onBack()} // Should probably go back to the photo screen, but onBack is standard
                    className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-[#E8EDF8] text-xs font-mono uppercase tracking-widest hover:bg-white/10"
                  >
                    Go Back &amp; Capture
                  </button>
                  <button 
                    onClick={() => handleContinue()} 
                    className="flex-1 py-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono uppercase tracking-widest hover:bg-rose-500/30"
                  >
                    Continue Anyway
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
            <div className="p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.1] backdrop-blur-3xl space-y-8">
              <p className="font-mono text-[10px] text-[#AABDCF] uppercase tracking-[0.3em]">Official Strategy</p>
              <div className="space-y-6">
                {claimRelated === true && (
                  <div className="p-5 rounded-2xl border border-amber-500/40 bg-amber-500/[0.06] space-y-3">
                    <p className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-[0.15em]">
                      {WISCONSIN_CLAIM_NOTICE.heading}
                    </p>
                    <ul className="space-y-1.5 pl-4 list-disc marker:text-amber-500/50">
                      {WISCONSIN_CLAIM_NOTICE.lines.map((line, i) => (
                        <li key={i} className="text-xs text-amber-200/70 font-light leading-relaxed">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(isClaimPath ? CLAIM_TERMS : REPAIR_TERMS).map((t, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <ChevronRight className="w-4 h-4 text-indigo-400 mt-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                    <p className="text-[#DDE5F5] font-light text-sm leading-relaxed group-hover:text-[#C2D0E4] transition-colors">{t}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-10">
              {isClaimPath && (
                <section className="space-y-6">
                  <p className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-[0.3em] pl-2">Insurance Status</p>
                  <div className="flex gap-4">
                    {[
                      { val: true, label: "Claim Related", icon: Zap },
                      { val: false, label: "Direct Project", icon: Shield }
                    ].map((opt) => (
                      <button
                        key={String(opt.val)}
                        onClick={() => setClaimRelated(opt.val)}
                        className={cn(
                          "flex-1 p-6 rounded-[32px] border transition-all duration-300 flex flex-col items-center gap-3 text-center",
                          claimRelated === opt.val 
                            ? "bg-indigo-500/20 border-indigo-500/40" 
                            : "bg-white/[0.02] border-white/[0.05] hover:border-white/20"
                        )}
                      >
                        <opt.icon className={cn("w-6 h-6", claimRelated === opt.val ? "text-indigo-400" : "text-[#7090B0]")} />
                        <span className={cn("text-xs font-display font-medium", claimRelated === opt.val ? "text-[#E8EDF8]" : "text-[#AABDCF]")}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <div className="space-y-4">
                <p className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-[0.3em] pl-2">Required Acknowledgements</p>
                {[
                  "I have reviewed the documented inspection findings with my Hustad representative and they reflect the actual conditions found at my property.",
                  "I understand that authorizing this agreement does not guarantee insurance coverage, claim approval, or any specific payment by my insurer.",
                  "I understand that my deductible, depreciation holds, and any non-covered amounts remain my financial responsibility regardless of the claim outcome.",
                  "I understand that Hustad Companies is not a public adjuster and cannot negotiate my claim or promise a specific coverage result.",
                  "I confirm that all required property owners and insurance policyholders have been notified of this authorization and have the opportunity to review it before signing."
                ].map((text, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const newAcks = [...acks];
                      newAcks[idx] = !newAcks[idx];
                      setAcks(newAcks);
                    }}
                    className={cn(
                      "w-full flex items-start gap-5 p-6 rounded-[32px] border transition-all duration-300 text-left",
                      acks[idx] ? "bg-indigo-500/10 border-indigo-500/30" : "bg-white/[0.02] border-white/[0.05] hover:border-white/20",
                      errors.ack && !acks[idx] && "border-rose-500/50 bg-rose-500/5"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                      acks[idx] ? "bg-indigo-500 border-indigo-500" : "border-white/20"
                    )}>
                      {acks[idx] && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <p className="text-sm text-[#DDE5F5] font-light leading-relaxed">
                      {text}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Full Agreement Preview */}
          <div className="w-full border border-white/[0.08] rounded-[40px] overflow-hidden">
            <button
              onClick={() => setShowAgreement(!showAgreement)}
              className="w-full flex items-center justify-between px-8 py-6 bg-white/[0.02] hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-[0.2em]">Full Agreement Preview</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-[#7090B0] transition-transform duration-300", showAgreement && "rotate-180")} />
            </button>
            <AnimatePresence>
              {showAgreement && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="max-h-[400px] overflow-y-auto px-8 pb-8 pt-4 space-y-8 text-left border-t border-white/[0.06]">
                    <p className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest">
                      This is a preview of the agreement you are authorizing. The executed copy will be emailed upon signature.
                    </p>
                    {AGREEMENT_SECTIONS.map((section, i) => (
                      <div key={i} className="space-y-2">
                        <p className="text-xs font-mono font-bold text-[#AABDCF] uppercase tracking-[0.15em]">{section.heading}</p>
                        <p className="text-sm text-[#7090B0] font-light leading-relaxed">{section.body}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/95 to-transparent pointer-events-none">
        <div className="relative max-w-5xl mx-auto flex flex-col gap-4 pointer-events-auto">
          <div className="flex items-center justify-between gap-3 md:gap-6">
            <button onClick={onBack} className="group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 shrink-0">
              <ArrowLeft className="w-4 h-4 text-[#DDE5F5] group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-display font-medium text-[#E8EDF8]">Back</span>
            </button>
            <StarButton 
              onClick={handleContinue} 
              disabled={isSubmitting}
              lightColor="#FAFAFA" 
              backgroundColor="#060606" 
              className="flex-1 h-14 md:h-20 rounded-full shadow-[0_20px_60px_rgba(99,102,241,0.2)] active:scale-95 transition-all group"
            >
              <div className="flex items-center justify-center gap-4">
                <span className="text-sm md:text-xl font-display font-semibold tracking-tight">
                  {isSubmitting ? "Authorizing..." : "Continue to Authorization"}
                </span>
                {!isSubmitting && <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />}
              </div>
            </StarButton>
          </div>
          <button
            onClick={handleSendForReview}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2.5 h-12 md:h-14 rounded-full text-sm font-medium transition-all bg-[#1D55C4]/10 border border-[#1D55C4]/30 text-indigo-300 hover:bg-[#1D55C4]/20 disabled:opacity-50"
          >
            <Send className="w-4 h-4 text-indigo-400" />
            {isSubmitting ? "Sending..." : "Send Agreement for Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
