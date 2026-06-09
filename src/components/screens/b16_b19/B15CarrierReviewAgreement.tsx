"use client";

import { useState, useRef } from "react";
import type { SessionState } from "@/types/session";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronRight, CheckCircle2, FileText, Shield, ShieldCheck,
  Clock, MapPin, User, Mail, Phone, BookOpen, AlertTriangle, PenTool,
  ChevronDown, ChevronUp, Send, X, Building2, CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { addAuditEvent, submitSession, generateReviewToken } from "@/lib/session";
import { syncSession } from "@/lib/api";
import { AGREEMENT_SECTIONS, WISCONSIN_CLAIM_NOTICE } from "./constants";
import { useTheme } from "@/components/ThemeProvider";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Step = "15A" | "15B" | "15C";

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

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

function MicroLabel({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const LM = getDynamicLM(theme);
  return (
    <p className="text-[10px] font-mono uppercase tracking-[1.8px]"
       style={{ color: LM.navyLight }}>
      {children}
    </p>
  );
}

function StepPips({ current }: { current: Step }) {
  const { theme } = useTheme();
  const LM = getDynamicLM(theme);
  const steps: Step[] = ["15A", "15B", "15C"];
  const labels = ["How It Works", "Agreement Review", "Authorization"];
  const idx = steps.indexOf(current);
  return (
    <div className="hidden md:flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center justify-center text-[11px] font-mono font-semibold transition-all"
              style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: i < idx ? LM.green : i === idx ? LM.blue : LM.navyFaint,
                color: i <= idx ? "#fff" : LM.navyLight,
              }}
            >
              {i < idx ? <CheckCircle2 size={12} strokeWidth={2.5} /> : i + 1}
            </div>
            <span style={{ fontSize: "11px", color: i === idx ? LM.navy : LM.navyLight, fontWeight: i === idx ? 600 : 400 }}>
              {labels[i]}
            </span>
          </div>
          {i < 2 && (
            <div style={{ width: "20px", height: "1px", background: i < idx ? LM.green : LM.navyFaint }} />
          )}
        </div>
      ))}
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  step,
}: {
  eyebrow: string;
  title: React.ReactNode;
  step: Step;
}) {
  const { theme } = useTheme();
  const LM = getDynamicLM(theme);
  return (
    <div className="flex items-start justify-between gap-6 mb-6">
      <div>
        <p style={{ color: LM.blue, fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 500 }}>
          {eyebrow}
        </p>
        <h1 style={{ color: LM.navy, fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.02em", marginTop: "6px" }}>
          {title}
        </h1>
      </div>
      <StepPips current={step} />
    </div>
  );
}

function CTABar({
  onBack,
  onPrimary,
  primaryLabel,
  primaryDisabled,
  onSecondary,
  secondaryLabel,
}: {
  onBack: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onSecondary?: () => void;
  secondaryLabel?: string;
}) {
  const { theme } = useTheme();
  const LM = getDynamicLM(theme);
  const { card: CARD } = getCardStyles(LM);
  return (
    <div
      className="absolute bottom-0 inset-x-0 px-8 pb-8 pt-20 z-20"
      style={{ background: `linear-gradient(to top, ${LM.pageBg} 65%, transparent)` }}
    >
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2.5 px-6 h-[52px] rounded-[12px] text-[14px] font-medium shrink-0 transition-opacity hover:opacity-70 active:scale-[0.98]"
            style={{ background: LM.cardBg, border: `1px solid ${LM.borderMid}`, color: LM.navyMid, boxShadow: LM.shadow }}
          >
            <ArrowLeft size={15} strokeWidth={1.5} />
            Back
          </button>

          <button
            onClick={onPrimary}
            disabled={primaryDisabled}
            className="flex-1 flex items-center justify-center gap-3 h-[52px] rounded-[12px] text-[15px] font-semibold transition-all active:scale-[0.99]"
            style={primaryDisabled
              ? { background: LM.disabledBg, border: `1px solid ${LM.border}`, color: LM.disabled, cursor: "not-allowed" }
              : { background: LM.blue, color: "#fff", boxShadow: "0 4px 18px rgba(29,85,196,0.28)" }
            }
          >
            {primaryLabel}
            {!primaryDisabled && <ChevronRight size={17} strokeWidth={2} />}
          </button>
        </div>

        {onSecondary && secondaryLabel && (
          <button
            onClick={onSecondary}
            className="w-full flex items-center justify-center gap-2.5 h-[52px] rounded-[12px] text-[15px] font-semibold transition-all active:scale-[0.99] mt-3"
            style={{ 
              color: LM.blue, 
              border: LM.isDark ? `1.5px solid rgba(99,102,241,0.15)` : `1px solid ${LM.blueBorder}`, 
              background: LM.isDark ? `#0F1123` : LM.blueLight 
            }}
          >
            <Send size={15} strokeWidth={2} />
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 15A — How the Carrier Review Agreement Works
// ─────────────────────────────────────────────────────────────────────────────

const HOW_IT_WORKS_STEPS = [
  {
    num: "01",
    icon: FileText,
    headline: "Document damage",
    body: "Hustad has completed the exterior inspection and organized all findings, photos, and documentation into a structured report prepared for carrier review.",
  },
  {
    num: "02",
    icon: Building2,
    headline: "Coordinate carrier review",
    body: "If you authorize, Hustad will coordinate the carrier inspection process and present the documented findings clearly to your insurer. Hustad does not negotiate your claim.",
  },
  {
    num: "03",
    icon: ShieldCheck,
    headline: "Confirm scope and coverage",
    body: "Your insurance carrier reviews the documented evidence and makes the coverage determination under your policy. Hustad cannot predict or guarantee any coverage outcome.",
  },
  {
    num: "04",
    icon: CheckCircle2,
    headline: "Move forward only if you agree",
    body: "No repair work begins until your carrier issues a written determination, you confirm the scope, and you authorize production in writing. You stay in control at every step.",
  },
];

function Step15A({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { theme } = useTheme();
  const LM = getDynamicLM(theme);
  const { card: CARD, cardLg: CARD_LG } = getCardStyles(LM);
  return (
    <div className="relative flex flex-col h-screen" style={{ background: LM.pageBg }}>
      <div className="px-8 pt-8 pb-0 shrink-0">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            eyebrow="Page 15A · Carrier Review Agreement"
            title={<>How the Carrier Review<br />Agreement Works</>}
            step="15A"
          />

          <div
            className="flex items-start gap-3 px-5 py-3.5 rounded-[12px] mb-8"
            style={{ background: LM.blueLight, border: `1px solid ${LM.blueBorder}` }}
          >
            <Shield size={14} strokeWidth={1.5} style={{ color: LM.blue, marginTop: "2px", flexShrink: 0 }} />
            <p style={{ color: LM.blue, fontSize: "13px", lineHeight: 1.55 }}>
              Reading this page does not commit you to anything. Review the four steps below, then decide whether to proceed.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-36" style={{ scrollbarWidth: "none" as React.CSSProperties["scrollbarWidth"] }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {HOW_IT_WORKS_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                style={CARD_LG}
                className="p-7 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ background: LM.blueLight, border: `1px solid ${LM.blueBorder}` }}
                  >
                    <Icon size={18} strokeWidth={1.5} style={{ color: LM.blue }} />
                  </div>
                  <span style={{ fontFamily: "monospace", fontSize: "32px", fontWeight: 200, color: LM.navyFaint, lineHeight: 1 }}>
                    {step.num}
                  </span>
                </div>
                <div className="space-y-2">
                  <p style={{ color: LM.navy, fontSize: "17px", fontWeight: 600, lineHeight: 1.2 }}>
                    {step.headline}
                  </p>
                  <p style={{ color: LM.navyMid, fontSize: "13.5px", lineHeight: 1.65 }}>
                    {step.body}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="max-w-4xl mx-auto mt-5">
          <div
            className="flex items-start gap-3 px-5 py-4 rounded-[12px]"
            style={{ background: LM.amberBg, border: `1px solid ${LM.amberBorder}` }}
          >
            <AlertTriangle size={14} strokeWidth={1.5} style={{ color: LM.amber, marginTop: "2px", flexShrink: 0 }} />
            <p style={{ color: LM.amber, fontSize: "12.5px", lineHeight: 1.55 }}>
              This agreement does not guarantee claim approval, coverage, deductible waiver, a free roof, or immediate construction.
              Your insurance carrier makes all coverage decisions under your policy.
            </p>
          </div>
        </div>
      </div>

      <CTABar
        onBack={onBack}
        onPrimary={onNext}
        primaryLabel="Review the Agreement"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 15B — Insurance Contingency Agreement Review
// ─────────────────────────────────────────────────────────────────────────────

const PLAIN_ENGLISH_CARDS = [
  {
    icon: Shield,
    title: "What this agreement does",
    body: "This agreement authorizes Hustad to prepare storm documentation, coordinate with your insurance carrier, and serve as your selected contractor for covered exterior restoration work — if the claim is approved and the final scope is confirmed with you.",
  },
  {
    icon: ShieldCheck,
    title: "What this agreement does not do",
    body: "This does not guarantee claim approval, coverage amount, payment timing, or final carrier scope. Your insurance carrier makes all coverage decisions under your policy.",
  },
  {
    icon: AlertTriangle,
    title: "Your financial responsibility",
    body: "Your deductible, any depreciation holds, and non-covered items remain your financial responsibility regardless of the claim outcome. No work begins until you approve the final scope in writing.",
  },
];

const ACK_ITEMS = [
  "I reviewed the documented inspection findings and they reflect actual conditions at my property.",
  "I understand my insurance carrier determines coverage — this agreement does not guarantee claim approval.",
  "I understand my deductible and any non-covered items remain my financial responsibility.",
  "I understand Hustad will email me the full report and executed agreement upon signing.",
  "I understand this agreement should be reviewed by all required property owners or policyholders.",
];

function Step15B({
  session,
  acks,
  setAcks,
  onNext,
  onBack,
  onSendForReview,
}: {
  session: SessionState;
  acks: boolean[];
  setAcks: (a: boolean[]) => void;
  onNext: () => void;
  onBack: () => void;
  onSendForReview: () => void;
}) {
  const { theme } = useTheme();
  const LM = getDynamicLM(theme);
  const { card: CARD, cardLg: CARD_LG } = getCardStyles(LM);
  const [showAgreement, setShowAgreement] = useState(false);
  const allChecked = acks.every(Boolean);
  const isClaimPath = session.pathData.claimRelatedWork === true;

  return (
    <div className="relative flex flex-col h-screen" style={{ background: LM.pageBg }}>
      <div className="px-8 pt-8 pb-0 shrink-0">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            eyebrow="Page 15B · Agreement Review"
            title="Insurance Contingency Agreement Review"
            step="15B"
          />
          <p style={{ color: LM.navyMid, fontSize: "15px", lineHeight: 1.6, marginBottom: "28px", maxWidth: "560px" }}>
            Before you authorize, here is the agreement in plain English.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-44" style={{ scrollbarWidth: "none" as React.CSSProperties["scrollbarWidth"] }}>
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Plain-English cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLAIN_ENGLISH_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={CARD}
                  className="p-6 space-y-3"
                >
                  <div
                    className="w-9 h-9 rounded-[8px] flex items-center justify-center"
                    style={{ background: LM.blueLight, border: `1px solid ${LM.blueBorder}` }}
                  >
                    <Icon size={16} strokeWidth={1.5} style={{ color: LM.blue }} />
                  </div>
                  <p style={{ color: LM.navy, fontSize: "14px", fontWeight: 600 }}>{card.title}</p>
                  <p style={{ color: LM.navyMid, fontSize: "12.5px", lineHeight: 1.65 }}>{card.body}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Wisconsin notice (claim path only) — pulled from approved template */}
          {isClaimPath && (
            <div
              className="flex items-start gap-3 px-5 py-4 rounded-[14px]"
              style={{ background: LM.amberBg, border: `1px solid ${LM.amberBorder}` }}
            >
              <AlertTriangle size={14} strokeWidth={1.5} style={{ color: LM.amber, marginTop: "2px", flexShrink: 0 }} />
              <div className="space-y-2">
                <p style={{ color: LM.amber, fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  {WISCONSIN_CLAIM_NOTICE.heading}
                </p>
                <ul className="space-y-1">
                  {WISCONSIN_CLAIM_NOTICE.lines.map((line, i) => (
                    <li key={i} style={{ color: LM.amber, fontSize: "12px", lineHeight: 1.5, display: "flex", gap: "8px" }}>
                      <span style={{ flexShrink: 0, opacity: 0.6 }}>·</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Full Agreement Preview — from active approved template */}
          <div
            className="overflow-hidden"
            style={{ ...CARD, borderRadius: "16px" }}
          >
            <button
              onClick={() => setShowAgreement(!showAgreement)}
              className="w-full flex items-center justify-between px-6 py-4 transition-colors hover:bg-gray-50"
              style={{ borderBottom: showAgreement ? `1px solid ${LM.border}` : "none" }}
            >
              <div className="flex items-center gap-3">
                <FileText size={15} strokeWidth={1.5} style={{ color: LM.blue }} />
                <span style={{ color: LM.navy, fontSize: "13.5px", fontWeight: 600 }}>
                  Full Agreement Preview
                </span>
                <span style={{ color: LM.navyLight, fontSize: "11px" }}>
                  — Insurance Contingency Agreement (Active Template)
                </span>
              </div>
              {showAgreement
                ? <ChevronUp size={16} strokeWidth={1.5} style={{ color: LM.navyLight }} />
                : <ChevronDown size={16} strokeWidth={1.5} style={{ color: LM.navyLight }} />
              }
            </button>

            <AnimatePresence initial={false}>
              {showAgreement && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="max-h-[440px] overflow-y-auto px-6 py-5 space-y-6">
                    <p style={{ color: LM.navyLight, fontSize: "11px", fontFamily: "monospace", letterSpacing: "0.5px" }}>
                      Preview of the agreement you will be authorizing. The executed copy is emailed upon signature.
                    </p>
                    {AGREEMENT_SECTIONS.map((section, i) => (
                      <div key={i} className="space-y-1.5">
                        <p style={{ color: LM.navy, fontSize: "12px", fontWeight: 600, letterSpacing: "0.3px" }}>
                          {section.heading}
                        </p>
                        <p style={{ color: LM.navyMid, fontSize: "12.5px", lineHeight: 1.65 }}>
                          {section.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Required Acknowledgements */}
          <div style={CARD_LG} className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <MicroLabel>Required Acknowledgements</MicroLabel>
              <span style={{ color: allChecked ? LM.green : LM.navyLight, fontSize: "11px", fontWeight: 500 }}>
                {acks.filter(Boolean).length} of {ACK_ITEMS.length} completed
              </span>
            </div>

            <div className="space-y-3">
              {ACK_ITEMS.map((text, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const next = [...acks];
                    next[idx] = !next[idx];
                    setAcks(next);
                  }}
                  className="w-full flex items-start gap-4 px-5 py-4 rounded-[12px] text-left transition-all"
                  style={{
                    background: acks[idx] ? LM.greenBg : LM.pageBg,
                    border: `1px solid ${acks[idx] ? LM.greenBorder : LM.border}`,
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-[5px] flex items-center justify-center shrink-0 mt-0.5 transition-all"
                    style={{
                      background: acks[idx] ? LM.green : LM.cardBg,
                      border: `1.5px solid ${acks[idx] ? LM.green : LM.borderMid}`,
                    }}
                  >
                    {acks[idx] && <CheckCircle2 size={12} strokeWidth={2.5} color="#fff" />}
                  </div>
                  <p style={{ color: LM.navy, fontSize: "13px", lineHeight: 1.6 }}>{text}</p>
                </button>
              ))}
            </div>

            {!allChecked && (
              <p style={{ color: LM.navyLight, fontSize: "11.5px", textAlign: "center", paddingTop: "4px" }}>
                Check all acknowledgements above to enable authorization.
              </p>
            )}
            {allChecked && (
              <div
                className="flex items-center justify-center gap-2 py-2.5 rounded-[10px]"
                style={{ background: LM.greenBg, border: `1px solid ${LM.greenBorder}` }}
              >
                <CheckCircle2 size={14} strokeWidth={2} style={{ color: LM.green }} />
                <p style={{ color: LM.green, fontSize: "12.5px", fontWeight: 600 }}>
                  All acknowledgements completed
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      <CTABar
        onBack={onBack}
        onPrimary={onNext}
        primaryLabel="Continue to Authorization"
        primaryDisabled={!allChecked}
        onSecondary={onSendForReview}
        secondaryLabel="Send Agreement for Review"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 15C — Authorization and Signature Review
// ─────────────────────────────────────────────────────────────────────────────

function Step15C({
  session,
  acksComplete,
  onUpdate,
  onNext,
  onBack,
  initialSendModalOpen = false,
}: {
  session: SessionState;
  acksComplete: boolean;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
  initialSendModalOpen?: boolean;
}) {
  const { theme } = useTheme();
  const LM = getDynamicLM(theme);
  const { card: CARD, cardLg: CARD_LG } = getCardStyles(LM);
  // Pre-fill from session — only ask for what's missing
  const [carrierName, setCarrierName]     = useState(session.property.insurerNameKnown || "");
  const [claimNumber, setClaimNumber]     = useState(session.property.claimNumberKnown || "");
  const [signed, setSigned]               = useState(false);
  const [errors, setErrors]               = useState<Record<string, string>>({});
  const [submitting, setSubmitting]       = useState(false);
  const [showSendModal, setShowSendModal] = useState(initialSendModalOpen);

  const signerName  = session.signatureData.signerName  || session.property.homeownerPrimaryName;
  const signerEmail = session.signatureData.signerEmail || session.property.homeownerPrimaryEmail;
  const address     = [session.property.address, session.property.cityStateZip].filter(Boolean).join(", ");
  const repName     = session.repName || "";
  const inspectionDate = session.createdAt
    ? new Date(session.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  const needsCarrier = !session.property.insurerNameKnown?.trim();

  const handleAuthorize = async () => {
    const e: Record<string, string> = {};
    if (!acksComplete)           e.acks = "Please complete the agreement acknowledgements on the previous step.";
    if (needsCarrier && !carrierName.trim()) e.carrier = "Insurance carrier name is required.";
    if (!signed)                 e.sig  = "Signature is required to authorize.";
    if (Object.keys(e).length) { setErrors(e); return; }

    setSubmitting(true);

    if (session.centerpointId) {
      try {
        let domain = "Sales";
        let type: string | undefined = undefined;
        let opportunityType: string | undefined = undefined;

        const outcome = session.findings.outcomeType;
        if (outcome === "repair_only") {
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
            targetStage: "Accepted",
            domain,
            type,
            opportunityType,
          }),
        });
      } catch (err) {
        console.error("Opportunity creation failed:", err);
      }
    }

    let updated: SessionState = {
      ...session,
      property: {
        ...session.property,
        insurerNameKnown: carrierName || session.property.insurerNameKnown,
        claimNumberKnown: claimNumber || session.property.claimNumberKnown,
      },
      signatureData: {
        ...session.signatureData,
        signerName:      signerName,
        signerEmail:     signerEmail,
        signatureImage:  "authorized",
        signedAt:        new Date().toISOString(),
      },
      pathData: {
        ...session.pathData,
        agreementAcknowledged: true,
        claimRelatedWork:      true,
      },
      sessionStatus: "authorization_pending",
    };
    updated = submitSession(updated);
    onUpdate(updated);
    onNext();
  };

  return (
    <div className="relative flex flex-col h-screen" style={{ background: LM.pageBg }}>
      <div className="px-8 pt-8 pb-0 shrink-0">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            eyebrow="Page 15C · Authorization"
            title="Authorization and Signature Review"
            step="15C"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-44" style={{ scrollbarWidth: "none" as React.CSSProperties["scrollbarWidth"] }}>
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Acknowledgements status */}
          {acksComplete ? (
            <div
              className="flex items-center gap-3 px-5 py-3.5 rounded-[12px]"
              style={{ background: LM.greenBg, border: `1px solid ${LM.greenBorder}` }}
            >
              <CheckCircle2 size={15} strokeWidth={2} style={{ color: LM.green }} />
              <p style={{ color: LM.green, fontSize: "13.5px", fontWeight: 600 }}>
                Acknowledgements completed — all five items reviewed.
              </p>
            </div>
          ) : (
            <div
              className="flex items-center gap-3 px-5 py-3.5 rounded-[12px] cursor-pointer"
              style={{ background: LM.amberBg, border: `1px solid ${LM.amberBorder}` }}
              onClick={onBack}
            >
              <AlertTriangle size={15} strokeWidth={1.5} style={{ color: LM.amber }} />
              <p style={{ color: LM.amber, fontSize: "13.5px", fontWeight: 600 }}>
                Acknowledgements incomplete — tap to return and complete them.
              </p>
            </div>
          )}

          {/* Pre-filled summary card */}
          <div style={CARD_LG} className="p-6 space-y-4">
            <MicroLabel>Review Information</MicroLabel>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { Icon: User,          label: "Homeowner",       value: signerName },
                { Icon: Mail,          label: "Email",           value: signerEmail },
                { Icon: MapPin,        label: "Property",        value: address },
                { Icon: CalendarCheck, label: "Inspection Date", value: inspectionDate },
                { Icon: User,          label: "Hustad Rep",      value: repName },
              ].map(({ Icon, label, value }) =>
                value ? (
                  <div key={label} className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: LM.blueLight, border: `1px solid ${LM.blueBorder}` }}
                    >
                      <Icon size={14} strokeWidth={1.5} style={{ color: LM.blue }} />
                    </div>
                    <div>
                      <p style={{ color: LM.navyLight, fontSize: "11px" }}>{label}</p>
                      <p style={{ color: LM.navy, fontSize: "13.5px", fontWeight: 500 }}>{value}</p>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Carrier — only collect if missing */}
          {needsCarrier && (
            <div style={CARD} className="p-6 space-y-3">
              <MicroLabel>Insurance Carrier</MicroLabel>
              <p style={{ color: LM.navyMid, fontSize: "12.5px" }}>
                Your insurance carrier name is needed to prepare the coordination package.
              </p>
              <input
                className="w-full rounded-[10px] px-4 py-3 text-[14px] outline-none transition-colors"
                style={{
                  background: LM.pageBg,
                  border: `1.5px solid ${errors.carrier ? "#DC2626" : LM.borderMid}`,
                  color: LM.navy,
                }}
                placeholder="e.g. State Farm, Allstate, American Family"
                value={carrierName}
                onChange={e => { setCarrierName(e.target.value); setErrors(prev => ({ ...prev, carrier: "" })); }}
              />
              {errors.carrier && (
                <p style={{ color: "#DC2626", fontSize: "11.5px" }}>{errors.carrier}</p>
              )}
            </div>
          )}

          {/* Claim number — always optional */}
          <div style={CARD} className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <MicroLabel>Claim Number</MicroLabel>
              <span style={{ color: LM.navyLight, fontSize: "11px" }}>Optional</span>
            </div>
            <input
              className="w-full rounded-[10px] px-4 py-3 text-[14px] outline-none transition-colors"
              style={{
                background: LM.pageBg,
                border: `1.5px solid ${LM.borderMid}`,
                color: LM.navy,
              }}
              placeholder="Enter claim number if already filed"
              value={claimNumber}
              onChange={e => setClaimNumber(e.target.value)}
            />
          </div>

          {/* Signature */}
          <div style={CARD_LG} className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <MicroLabel>Digital Signature</MicroLabel>
              {signed && (
                <span style={{ color: LM.green, fontSize: "11.5px", fontWeight: 600 }}>Signed</span>
              )}
            </div>
            <p style={{ color: LM.navyMid, fontSize: "12.5px", lineHeight: 1.55 }}>
              By signing, you authorize Hustad to prepare the documentation package and coordinate
              the carrier review. Your carrier makes all coverage decisions. No work begins until
              you approve the final scope in writing.
            </p>

            <div
              onClick={() => { setSigned(true); setErrors(prev => ({ ...prev, sig: "" })); }}
              className="flex items-center justify-center cursor-pointer rounded-[12px] transition-all"
              style={{
                height: "88px",
                border: `2px ${signed ? "solid" : "dashed"} ${errors.sig ? "#DC2626" : signed ? LM.green : LM.borderMid}`,
                background: signed ? LM.greenBg : LM.pageBg,
              }}
            >
              {signed ? (
                <p
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: "32px",
                    fontStyle: "italic",
                    color: LM.navy,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {signerName || "Authorized"}
                </p>
              ) : (
                <div className="flex items-center gap-2.5">
                  <PenTool size={16} strokeWidth={1.5} style={{ color: LM.navyLight }} />
                  <span style={{ color: LM.navyLight, fontSize: "13px" }}>Tap to sign</span>
                </div>
              )}
            </div>

            {errors.sig && (
              <p style={{ color: "#DC2626", fontSize: "11.5px" }}>{errors.sig}</p>
            )}
            {errors.acks && (
              <p style={{ color: "#DC2626", fontSize: "11.5px" }}>{errors.acks}</p>
            )}
          </div>

          {/* Rep companion — rep mode only */}
          {session.mode === "rep" && (
            <div
              className="flex items-start gap-3 px-5 py-4 rounded-[14px]"
              style={{ background: LM.blueLight, border: `1px solid ${LM.blueBorder}` }}
            >
              <BookOpen size={14} strokeWidth={1.5} style={{ color: LM.blue, marginTop: "2px", flexShrink: 0 }} />
              <div className="space-y-1">
                <p style={{ color: LM.blue, fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Rep · Page 15C
                </p>
                <p style={{ color: LM.blue, fontSize: "12.5px", lineHeight: 1.55, fontStyle: "italic" }}>
                  "You have reviewed the findings, the recommended path, and the agreement. If you are comfortable, sign today and we will email your full report and executed agreement immediately. If a co-decision-maker needs to review first, tap Send for Review and we will make sure they get everything."
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      <CTABar
        onBack={onBack}
        onPrimary={handleAuthorize}
        primaryLabel={submitting ? "Authorizing…" : "Authorize Now and Email My Copy"}
        primaryDisabled={submitting}
        onSecondary={() => setShowSendModal(true)}
        secondaryLabel="Send for Review Instead"
      />

      {/* Send-for-Review Modal */}
      <AnimatePresence>
        {showSendModal && (
          <SendForReviewModal
            session={session}
            carrierName={carrierName}
            claimNumber={claimNumber}
            onClose={() => setShowSendModal(false)}
            onSent={(updated) => { onUpdate(updated); onNext(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Send-for-Review Modal
// Collects only recipient name and email/phone if missing; pre-fills from session
// ─────────────────────────────────────────────────────────────────────────────

function SendForReviewModal({
  session,
  carrierName,
  claimNumber,
  onClose,
  onSent,
}: {
  session: SessionState;
  carrierName: string;
  claimNumber: string;
  onClose: () => void;
  onSent: (updated: SessionState) => void;
}) {
  const prefilledName  = session.buyerData.decisionMakerName  || session.property.homeownerPrimaryName || "";
  const prefilledEmail = session.buyerData.decisionMakerEmail || session.property.homeownerPrimaryEmail || "";
  const prefilledPhone = session.buyerData.decisionMakerMobile || session.property.homeownerPrimaryMobile || "";

  const [recipientName,  setRecipientName]  = useState(prefilledName);
  const [recipientEmail, setRecipientEmail] = useState(prefilledEmail);
  const [recipientPhone, setRecipientPhone] = useState(prefilledPhone);
  const [followUpDate,   setFollowUpDate]   = useState(session.signatureData.deferralFollowUpDate || "");
  const [followUpTime,   setFollowUpTime]   = useState(session.signatureData.deferralFollowUpTime || "");
  const [errors, setErrors]                 = useState<Record<string, string>>({});
  const [sending, setSending]               = useState(false);

  const needsName  = !prefilledName.trim();
  const needsContact = !prefilledEmail.trim() && !prefilledPhone.trim();

  const handleSend = async () => {
    const e: Record<string, string> = {};
    if (!recipientName.trim()) e.name = "Recipient name is required.";
    if (!recipientEmail.trim() && !recipientPhone.trim()) e.contact = "Email or phone is required.";
    if (!followUpDate) e.date = "Follow-up date is required.";
    if (!followUpTime) e.time = "Follow-up time is required.";
    if (Object.keys(e).length) { setErrors(e); return; }

    setSending(true);

    if (session.centerpointId) {
      try {
        let domain = "Sales";
        let type: string | undefined = undefined;
        let opportunityType: string | undefined = undefined;

        const outcome = session.findings.outcomeType;
        if (outcome === "repair_only") {
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
            targetStage: "Pending",
            domain,
            type,
            opportunityType,
          }),
        });
      } catch (err) {
        console.error("Opportunity creation failed:", err);
      }
    }

    let updated: SessionState = {
      ...session,
      property: {
        ...session.property,
        insurerNameKnown: carrierName || session.property.insurerNameKnown,
        claimNumberKnown: claimNumber || session.property.claimNumberKnown,
      },
      sessionStatus: "deferred",
      pathData: {
        ...session.pathData,
        claimRelatedWork: true,
        agreementAcknowledged: true,
      },
      signatureData: {
        ...session.signatureData,
        summarySendRecipient:  recipientEmail || recipientPhone,
        deferralReason:        "send_for_review",
        deferralFollowUpDate:  followUpDate,
        deferralFollowUpTime:  followUpTime,
      },
    };
    updated = generateReviewToken(updated);
    updated = addAuditEvent(updated, "summary_sent", {
      recipient:  recipientEmail || recipientPhone,
      recipientName,
      token:      updated.reviewToken,
      followUp:   `${followUpDate} ${followUpTime}`,
    });
    try { await syncSession(updated); } catch { /* non-fatal */ }
    onSent(updated);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ background: "rgba(27,43,75,0.45)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="w-full max-w-md space-y-5"
        style={{ ...CARD_LG, padding: "32px" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Send size={14} strokeWidth={1.5} style={{ color: LM.blue }} />
              <p style={{ color: LM.navy, fontSize: "17px", fontWeight: 700, letterSpacing: "-0.01em" }}>
                Send for Review
              </p>
            </div>
            <p style={{ color: LM.navyMid, fontSize: "12.5px", lineHeight: 1.5 }}>
              Hustad will email the full report and executable agreement so it can be reviewed before authorization.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-opacity hover:opacity-70"
            style={{ background: LM.pageBg, border: `1px solid ${LM.borderMid}` }}
          >
            <X size={14} strokeWidth={1.5} style={{ color: LM.navyLight }} />
          </button>
        </div>

        <div style={{ height: "1px", background: LM.borderMid, opacity: 0.5 }} />

        {/* Recipient name — only ask if missing */}
        {(needsName || true) && (
          <div className="space-y-1.5">
            <label style={{ color: LM.navyMid, fontSize: "11.5px", fontWeight: 500 }}>Recipient Name</label>
            <input
              className="w-full rounded-[10px] px-4 py-3 text-[14px] outline-none"
              style={{
                background: LM.pageBg,
                border: `1.5px solid ${errors.name ? "#DC2626" : LM.borderMid}`,
                color: LM.navy,
              }}
              placeholder="Who should receive this?"
              value={recipientName}
              onChange={e => { setRecipientName(e.target.value); setErrors(p => ({ ...p, name: "" })); }}
            />
            {errors.name && <p style={{ color: "#DC2626", fontSize: "11px" }}>{errors.name}</p>}
          </div>
        )}

        {/* Contact — email or phone */}
        <div className="space-y-1.5">
          <label style={{ color: LM.navyMid, fontSize: "11.5px", fontWeight: 500 }}>Email Address</label>
          <input
            className="w-full rounded-[10px] px-4 py-3 text-[14px] outline-none"
            type="email"
            style={{
              background: LM.pageBg,
              border: `1.5px solid ${errors.contact ? "#DC2626" : LM.borderMid}`,
              color: LM.navy,
            }}
            placeholder="Email address"
            value={recipientEmail}
            onChange={e => { setRecipientEmail(e.target.value); setErrors(p => ({ ...p, contact: "" })); }}
          />
        </div>

        {needsContact && (
          <div className="space-y-1.5">
            <label style={{ color: LM.navyMid, fontSize: "11.5px", fontWeight: 500 }}>
              Phone <span style={{ color: LM.navyFaint }}>— if no email</span>
            </label>
            <input
              className="w-full rounded-[10px] px-4 py-3 text-[14px] outline-none"
              type="tel"
              style={{
                background: LM.pageBg,
                border: `1.5px solid ${errors.contact ? "#DC2626" : LM.borderMid}`,
                color: LM.navy,
              }}
              placeholder="Phone number"
              value={recipientPhone}
              onChange={e => { setRecipientPhone(e.target.value); setErrors(p => ({ ...p, contact: "" })); }}
            />
            {errors.contact && <p style={{ color: "#DC2626", fontSize: "11px" }}>{errors.contact}</p>}
          </div>
        )}

        {/* Follow-up */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label style={{ color: LM.navyMid, fontSize: "11.5px", fontWeight: 500 }}>Follow-up Date</label>
            <input
              type="date"
              className="w-full rounded-[10px] px-4 py-3 text-[14px] outline-none"
              style={{
                background: LM.pageBg,
                border: `1.5px solid ${errors.date ? "#DC2626" : LM.borderMid}`,
                color: LM.navy,
              }}
              value={followUpDate}
              onChange={e => { setFollowUpDate(e.target.value); setErrors(p => ({ ...p, date: "" })); }}
            />
            {errors.date && <p style={{ color: "#DC2626", fontSize: "10px" }}>{errors.date}</p>}
          </div>
          <div className="space-y-1.5">
            <label style={{ color: LM.navyMid, fontSize: "11.5px", fontWeight: 500 }}>Follow-up Time</label>
            <input
              type="time"
              className="w-full rounded-[10px] px-4 py-3 text-[14px] outline-none"
              style={{
                background: LM.pageBg,
                border: `1.5px solid ${errors.time ? "#DC2626" : LM.borderMid}`,
                color: LM.navy,
              }}
              value={followUpTime}
              onChange={e => { setFollowUpTime(e.target.value); setErrors(p => ({ ...p, time: "" })); }}
            />
            {errors.time && <p style={{ color: "#DC2626", fontSize: "10px" }}>{errors.time}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-[10px] text-[13.5px] font-medium transition-opacity hover:opacity-70"
            style={{ background: LM.pageBg, border: `1px solid ${LM.borderMid}`, color: LM.navyMid }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 h-11 rounded-[10px] text-[13.5px] font-semibold text-white flex items-center justify-center gap-2 transition-all"
            style={{ background: LM.blue, boxShadow: "0 3px 12px rgba(29,85,196,0.25)" }}
          >
            <Send size={13} strokeWidth={1.5} />
            {sending ? "Sending…" : "Send Report & Agreement"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// B15CarrierReviewAgreement — orchestrates 15A → 15B → 15C
// ─────────────────────────────────────────────────────────────────────────────

export function B15CarrierReviewAgreement({ session, onUpdate, onNext, onBack }: Props) {
  const { theme } = useTheme();
  const LM = getDynamicLM(theme);
  const { card: CARD, cardLg: CARD_LG } = getCardStyles(LM);
  const [step, setStep] = useState<Step>("15A");
  const [sendModalOpen, setSendModalOpen] = useState(false);
  // Persist ack state across step transitions
  const [acks, setAcks] = useState<boolean[]>(() =>
    Array(ACK_ITEMS.length).fill(session.pathData.agreementAcknowledged ?? false)
  );
  const acksComplete = acks.every(Boolean);

  const goTo = (s: Step) => setStep(s);

  const handleBack = () => {
    if (step === "15A") onBack();
    else if (step === "15B") goTo("15A");
    else goTo("15B");
  };

  // Persist acks into session when leaving 15B
  const handleTo15C = () => {
    const updated: SessionState = {
      ...session,
      pathData: { ...session.pathData, agreementAcknowledged: acksComplete },
    };
    onUpdate(updated);
    setSendModalOpen(false);
    goTo("15C");
  };

  // From 15B: send for review opens 15C with send modal
  const handleSendFromB = () => {
    const updated: SessionState = {
      ...session,
      pathData: { ...session.pathData, agreementAcknowledged: acksComplete },
    };
    onUpdate(updated);
    setSendModalOpen(true);
    goTo("15C");
  };

  if (step === "15A") {
    return <Step15A onNext={() => goTo("15B")} onBack={handleBack} />;
  }

  if (step === "15B") {
    return (
      <Step15B
        session={session}
        acks={acks}
        setAcks={setAcks}
        onNext={handleTo15C}
        onBack={handleBack}
        onSendForReview={handleSendFromB}
      />
    );
  }

  return (
    <Step15C
      session={session}
      acksComplete={acksComplete}
      onUpdate={onUpdate}
      onNext={onNext}
      onBack={handleBack}
      initialSendModalOpen={sendModalOpen}
    />
  );
}
