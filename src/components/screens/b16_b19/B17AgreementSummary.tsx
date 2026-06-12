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
import { useTheme } from "@/components/ThemeProvider";

interface Props {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Light-mode design tokens — cream/off-white bg, navy text, blue accents
// ─────────────────────────────────────────────────────────────────────────────

const LM = {
  pageBg:       "#F7F5F1",
  cardBg:       "#FFFFFF",
  navy:         "#1B2B4B",
  navyMid:      "rgba(27,43,75,0.62)",
  navyLight:    "rgba(27,43,75,0.40)",
  navyFaint:    "rgba(27,43,75,0.18)",
  blue:         "#1D55C4",
  blueDark:     "#1540A0",
  blueLight:    "rgba(29,85,196,0.07)",
  blueActive:   "rgba(29,85,196,0.12)",
  blueBorder:   "rgba(29,85,196,0.22)",
  border:       "rgba(27,43,75,0.10)",
  borderMid:    "rgba(27,43,75,0.16)",
  shadow:       "0 1px 4px rgba(27,43,75,0.06), 0 2px 12px rgba(27,43,75,0.07)",
  shadowLg:     "0 4px 24px rgba(27,43,75,0.10), 0 1px 6px rgba(27,43,75,0.06)",
  green:        "#166534",
  greenBg:      "rgba(22,101,52,0.07)",
  greenBorder:  "rgba(22,101,52,0.20)",
  amber:        "#92400E",
  amberBg:      "rgba(146,64,14,0.07)",
  amberBorder:  "rgba(146,64,14,0.20)",
  disabled:     "rgba(27,43,75,0.28)",
  disabledBg:   "rgba(27,43,75,0.05)",
};

const CARD: React.CSSProperties = {
  background:   LM.cardBg,
  border:       `1px solid ${LM.border}`,
  borderRadius: "16px",
  boxShadow:    LM.shadow,
};

const CARD_LG: React.CSSProperties = {
  ...CARD,
  borderRadius: "20px",
  boxShadow:    LM.shadowLg,
};

function getDynamicLM(theme: string) {
  const isDark = theme === "dark";
  if (!isDark) {
    return {
      isDark:       false,
      pageBg:       "#F7F5F1",
      cardBg:       "#FFFFFF",
      navy:         "#1B2B4B",
      navyMid:      "rgba(27,43,75,0.62)",
      navyLight:    "rgba(27,43,75,0.40)",
      navyFaint:    "rgba(27,43,75,0.18)",
      blue:         "#1D55C4",
      blueDark:     "#1540A0",
      blueLight:    "rgba(29,85,196,0.07)",
      blueActive:   "rgba(29,85,196,0.12)",
      blueBorder:   "rgba(29,85,196,0.22)",
      border:       "rgba(27,43,75,0.10)",
      borderMid:    "rgba(27,43,75,0.16)",
      shadow:       "0 1px 4px rgba(27,43,75,0.06), 0 2px 12px rgba(27,43,75,0.07)",
      shadowLg:     "0 4px 24px rgba(27,43,75,0.10), 0 1px 6px rgba(27,43,75,0.06)",
      green:        "#166534",
      greenBg:      "rgba(22,101,52,0.07)",
      greenBorder:  "rgba(22,101,52,0.20)",
      amber:        "#92400E",
      amberBg:      "rgba(146,64,14,0.07)",
      amberBorder:  "rgba(146,64,14,0.20)",
      disabled:     "rgba(27,43,75,0.28)",
      disabledBg:   "rgba(27,43,75,0.05)",
    };
  }

  return {
    isDark:       true,
    pageBg:       "#060606",
    cardBg:       "rgba(255,255,255,0.03)",
    navy:         "#E8EDF8",
    navyMid:      "#DDE5F5",
    navyLight:    "#8BA5C5",
    navyFaint:    "rgba(255,255,255,0.08)",
    blue:         "#818CF8", // indigo-400
    blueDark:     "#6366F1", // indigo-500
    blueLight:    "rgba(99,102,241,0.12)",
    blueActive:   "rgba(99,102,241,0.18)",
    blueBorder:   "rgba(99,102,241,0.30)",
    border:       "rgba(255,255,255,0.08)",
    borderMid:    "rgba(255,255,255,0.15)",
    shadow:       "0 20px 60px rgba(0,0,0,0.50)",
    shadowLg:     "0 30px 80px rgba(0,0,0,0.60)",
    green:        "#34D399",
    greenBg:      "rgba(52,211,153,0.10)",
    greenBorder:  "rgba(52,211,153,0.25)",
    amber:        "#FBBF24",
    amberBg:      "rgba(251,191,36,0.10)",
    amberBorder:  "rgba(251,191,36,0.25)",
    disabled:     "rgba(255,255,255,0.20)",
    disabledBg:   "rgba(255,255,255,0.02)",
  };
}

function getCardStyles(LM: any) {
  return {
    card: {
      background:   LM.cardBg,
      border:       `1px solid ${LM.border}`,
      borderRadius: "16px",
      boxShadow:    LM.shadow,
    } as React.CSSProperties,
    cardLg: {
      background:   LM.cardBg,
      border:       `1px solid ${LM.border}`,
      borderRadius: "20px",
      boxShadow:    LM.shadowLg,
    } as React.CSSProperties,
  };
}

export function B17AgreementSummary({ session, onUpdate, onNext, onBack }: Props) {
  const { theme } = useTheme();
  const LM = getDynamicLM(theme);
  const { card: CARD, cardLg: CARD_LG } = getCardStyles(LM);
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

      if (session.pathData.selectedPath === "direct_repair") {
        opportunityType = "Roof Replacement";
      } else if (outcome === "repair_only") {
        opportunityType = "Service";
      } else if (outcome === "claim_review_candidate") {
        opportunityType = "Hail/Wind Claim";
      } else if (outcome === "full_restoration_candidate") {
        opportunityType = "Roof Replacement";
      }

      await fetch("/api/centerpoint/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centerpointId: session.centerpointId,
          targetStage: session.pathData.selectedPath === "direct_repair" ? "Quote Replacement" : stage,
          domain,
          type,
          opportunityType,
        }),
      });
    } catch (err) {
      console.error("Opportunity creation failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = async () => {
    const e: Record<string, string> = {};
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
    <div className="relative flex flex-col h-screen w-full overflow-hidden" style={{ background: LM.pageBg }}>
      <div className="px-8 pt-8 pb-0 shrink-0">
        <div className="max-w-4xl mx-auto space-y-1">
          <p style={{ color: LM.blue, fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 500 }}>
            Page 17 · Agreement Summary
          </p>
          <h1 style={{ color: LM.navy, fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.02em", marginTop: "4px" }}>
            {isClaimPath ? "Insurance Contingency Agreement Review" : "Direct Replacement Agreement Review"}
          </h1>
          <p style={{ color: LM.navyMid, fontSize: "14.5px", lineHeight: 1.5, marginTop: "6px" }}>
            Review what you are authorizing before you proceed.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-48 pt-4 min-h-0" style={{ scrollbarWidth: "none" as React.CSSProperties["scrollbarWidth"] }}>
        <div className="max-w-4xl mx-auto space-y-6">
          <AnimatePresence>
            {showPhotoWarning && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ background: LM.amberBg, border: `1px solid ${LM.amberBorder}` }}
                className="p-6 rounded-[16px] space-y-4 text-left"
              >
                <div className="flex items-center gap-3" style={{ color: LM.amber }}>
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-base font-semibold">Incomplete Documentation</h3>
                </div>
                <p style={{ color: LM.navyMid, fontSize: "13px", lineHeight: 1.5 }}>
                  You are missing <span className="font-bold">{missingShots.length} required photos</span> for this forensic inspection. 
                  The dossier will be flagged as &quot;Partial Evidence&quot; in the command center.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => onBack()}
                    className="flex-1 py-3 rounded-xl text-xs font-semibold transition-opacity hover:opacity-75"
                    style={{ background: LM.pageBg, border: `1px solid ${LM.borderMid}`, color: LM.navy }}
                  >
                    Go Back &amp; Capture
                  </button>
                  <button 
                    onClick={() => handleContinue()} 
                    className="flex-1 py-3 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-75"
                    style={{ background: LM.amber, boxShadow: "0 3px 12px rgba(146,64,14,0.25)" }}
                  >
                    Continue Anyway
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div style={CARD_LG} className="p-6 space-y-6">
              <p className="text-[10px] font-mono uppercase tracking-[1.8px]" style={{ color: LM.navyLight }}>
                Agreement Scope
              </p>
              <div className="space-y-4">
                {claimRelated === true && (
                  <div className="p-4 rounded-xl space-y-2.5" style={{ background: LM.amberBg, border: `1px solid ${LM.amberBorder}` }}>
                    <p className="text-xs font-mono font-semibold uppercase tracking-[0.1em]" style={{ color: LM.amber }}>
                      {WISCONSIN_CLAIM_NOTICE.heading}
                    </p>
                    <ul className="space-y-1 pl-3 list-disc marker:text-amber-500/50">
                      {WISCONSIN_CLAIM_NOTICE.lines.map((line, i) => (
                        <li key={i} className="text-xs font-light leading-relaxed" style={{ color: LM.amber }}>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(isClaimPath ? CLAIM_TERMS : REPAIR_TERMS).map((t, i) => (
                  <div key={i} className="flex items-start gap-3 group">
                    <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 transition-opacity" style={{ color: LM.blue }} />
                    <p style={{ color: LM.navy, fontSize: "13px", lineHeight: 1.6 }}>{t}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {isClaimPath && (
                <div style={CARD} className="p-6 space-y-4">
                  <p className="text-[10px] font-mono uppercase tracking-[1.8px]" style={{ color: LM.navyLight }}>
                    Insurance Status
                  </p>
                  <div className="flex gap-3">
                    {[
                      { val: true, label: "Claim Related", icon: Zap },
                      { val: false, label: "Direct Project", icon: Shield }
                    ].map((opt) => (
                      <button
                        key={String(opt.val)}
                        onClick={() => setClaimRelated(opt.val)}
                        className="flex-1 p-5 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2.5 text-center"
                        style={claimRelated === opt.val
                          ? { background: LM.blueLight, border: `1.5px solid ${LM.blue}`, color: LM.blue }
                          : { background: LM.cardBg, border: `1.5px solid ${LM.border}`, color: LM.navyMid }
                        }
                      >
                        <opt.icon className="w-5 h-5" style={{ color: claimRelated === opt.val ? LM.blue : LM.navyLight }} />
                        <span className="text-[13px] font-semibold">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={CARD} className="p-6 space-y-4">
                <p className="text-[10px] font-mono uppercase tracking-[1.8px]" style={{ color: LM.navyLight }}>
                  Required Acknowledgements
                </p>
                <div className="space-y-3.5">
                  {[
                    "I reviewed the forensic findings, classifications, and report details.",
                    "I understand the contingency terms and my insurance claim rights.",
                    "I authorize Hustad to deliver the completed inspection package.",
                    "I authorize coordination scheduling for adjuster reviews.",
                    "I accept the scope of work described in the findings package."
                  ].map((text, i) => (
                    <label key={i} className="flex items-start gap-3 cursor-pointer group select-none">
                      <input 
                        type="checkbox" 
                        checked={acks[i]} 
                        onChange={(e) => {
                          const next = [...acks];
                          next[i] = e.target.checked;
                          setAcks(next);
                          setErrors({});
                        }}
                        className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span style={{ color: LM.navy, fontSize: "12.5px", lineHeight: 1.5 }}>{text}</span>
                    </label>
                  ))}
                </div>
                {errors.ack && (
                  <p style={{ color: "#DC2626", fontSize: "11px", fontWeight: 500 }}>{errors.ack}</p>
                )}
              </div>
            </div>
          </div>

          <div style={CARD_LG} className="overflow-hidden">
            <button
              onClick={() => setShowAgreement(!showAgreement)}
              className="w-full flex items-center justify-between px-6 py-4 transition-colors hover:bg-gray-50 text-left"
              style={{ borderBottom: showAgreement ? `1px solid ${LM.border}` : "none" }}
            >
              <div className="flex items-center gap-3">
                <FileText size={15} strokeWidth={1.5} style={{ color: LM.blue }} />
                <span style={{ color: LM.navy, fontSize: "13.5px", fontWeight: 600 }}>
                  Full Agreement Preview
                </span>
                <span style={{ color: LM.navyLight, fontSize: "11px" }}>
                  — Contingency Contract ( Wisconsin DATCP )
                </span>
              </div>
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
                  <div className="max-h-[300px] overflow-y-auto px-6 pb-6 pt-4 space-y-6 text-left border-t border-gray-100" style={{ scrollbarWidth: "thin" }}>
                    <p style={{ color: LM.navyLight, fontSize: "10px", lineHeight: 1.5 }} className="font-mono uppercase tracking-wider">
                      This is a preview of the agreement you are authorizing. The executed copy will be emailed upon signature.
                    </p>
                    {AGREEMENT_SECTIONS.map((section, i) => (
                      <div key={i} className="space-y-1.5">
                        <p style={{ color: LM.navy, fontSize: "12px", fontWeight: 700 }} className="font-mono uppercase tracking-wider">{section.heading}</p>
                        <p style={{ color: LM.navyMid, fontSize: "12.5px", lineHeight: 1.6 }} className="font-light">{section.body}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div 
        className="absolute bottom-0 inset-x-0 px-8 pb-8 pt-16 z-20"
        style={{ background: `linear-gradient(to top, ${LM.pageBg} 70%, transparent)` }}
      >
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="flex items-center justify-center gap-2.5 px-6 h-[52px] rounded-[12px] text-[14px] font-medium shrink-0 transition-opacity hover:opacity-75"
              style={{ background: LM.pageBg, border: `1px solid ${LM.borderMid}`, color: LM.navy }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            {isClaimPath ? (
              <button 
                onClick={handleContinue} 
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-3 h-[52px] rounded-[12px] text-[15px] font-semibold text-white transition-all active:scale-[0.99] disabled:opacity-50"
                style={{ background: LM.blue, boxShadow: "0 4px 18px rgba(29,85,196,0.28)" }}
              >
                <span>{isSubmitting ? "Authorizing..." : "Continue to Authorization"}</span>
                {!isSubmitting && <ChevronRight size={17} strokeWidth={2} />}
              </button>
            ) : (
              <button
                onClick={handleSendForReview}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-3 h-[52px] rounded-[12px] text-[15px] font-semibold text-white transition-all active:scale-[0.99] disabled:opacity-50"
                style={{ background: LM.blue, boxShadow: "0 4px 18px rgba(29,85,196,0.28)" }}
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? "Sending..." : "Send Agreement for Review"}</span>
              </button>
            )}
          </div>
          {isClaimPath && (
            <button
              onClick={handleSendForReview}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2.5 h-[44px] rounded-[10px] text-[14px] font-medium transition-all disabled:opacity-50 hover:opacity-75"
              style={{ color: LM.blue, border: `1px solid ${LM.blueBorder}`, background: LM.blueLight }}
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? "Sending..." : "Send Agreement for Review"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
