"use client";

import { useState, useEffect } from "react";
import type { SessionState, SelectedPath, InspectionPhoto } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StarButton } from "@/components/ui/star-button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Zap, Eye, Wrench, FileText, AlertTriangle, ChevronRight, ArrowLeft,
  Unlock, CheckCircle2, Camera, MapPin, Clock, ExternalLink, ShieldCheck,
  XCircle, MessageSquare, Calendar, CloudLightning, ShieldAlert, ArrowRight,
  ChevronDown, ChevronUp, Layers, BookOpen, Hammer, Sparkles, FileCheck,
  MessageCircle, Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { setSelectedPath, addAuditEvent, unlockSummary } from "@/lib/session";
import { PhotoThumbnail } from "@/components/PhotoThumbnail";

// ─────────────────────────────────────────────────────────────────────────────
// Shared interface
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
  onRepJump?: (screen: import("@/types/session").ScreenId) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// B12 — Findings Summary (Page 13)
// Luxury dark SaaS redesign · Deep navy · Cormorant Garamond editorial
// ─────────────────────────────────────────────────────────────────────────────

type PathKey   = "carrier_review" | "urgent_repair" | "no_action";
type PhotoCategory = "storm" | "urgent" | "repair" | "maintenance" | "monitor" | "overview";

interface PhotoEntry {
  id:          string;
  url?:        string | undefined;
  date:        string;
  type:        "legacy" | "structured";
  caption?:    string | undefined;
  rawCategory?: string | undefined;
  section?:    string | undefined;
  description?: string | undefined;
  photo?:      InspectionPhoto | undefined;
}

// ── Path derivation ───────────────────────────────────────────────────────────

function derivePathKey(outcome: string | null, urgentCount: number): PathKey {
  if (urgentCount > 0 || outcome === "repair_only") return "urgent_repair";
  if (outcome === "claim_review_candidate" || outcome === "full_restoration_candidate") return "carrier_review";
  return "no_action";
}

// ── Photo helpers ─────────────────────────────────────────────────────────────

function buildPhotoList(session: SessionState): PhotoEntry[] {
  const legacy = (session.photoAssets || [])
    .filter(p => p.selectedForSummary)
    .map(p => ({
      id:          p.assetId,
      url:         p.dataUrl as string | undefined,
      date:        p.createdAt,
      type:        "legacy" as PhotoEntry["type"],
      caption:     p.caption as string | undefined,
      rawCategory: p.category as string | undefined,
      section:     undefined as string | undefined,
      description: undefined as string | undefined,
      photo:       undefined as InspectionPhoto | undefined,
    }));
  const structured = (session.photos || [])
    .filter(p => p.selectedForSummary)
    .map(p => ({
      id:          p.id,
      url:         undefined as string | undefined,
      date:        p.createdAt,
      type:        "structured" as PhotoEntry["type"],
      caption:     p.label as string | undefined,
      rawCategory: p.category as string | undefined,
      section:     p.section as string | undefined,
      description: p.description as string | undefined,
      photo:       p as InspectionPhoto | undefined,
    }));
  return [...legacy, ...structured];
}

function classifyPhoto(e: PhotoEntry): PhotoCategory {
  const t = `${e.rawCategory ?? ""} ${e.caption ?? ""} ${e.section ?? ""}`.toLowerCase();
  if (t.includes("urgent") || t.includes("exposed") || t.includes("missing kickout") || t.includes("open flashing")) return "urgent";
  if (t.includes("storm") || t.includes("hail") || t.includes("wind") || t.includes("impact") || t.includes("bruise") || t.includes("dent")) return "storm";
  if (t.includes("repair") || t.includes("lifting") || t.includes("sealant") || t.includes("flashing") || t.includes("drip edge") || t.includes("alignment")) return "repair";
  if (t.includes("maintenance") || t.includes("debris") || t.includes("gutter") || t.includes("clog") || t.includes("valley debris")) return "maintenance";
  if (t.includes("monitor") || t.includes("wear") || t.includes("granule") || t.includes("age") || t.includes("weathering")) return "monitor";
  return "overview";
}

interface PhotoMeta {
  badgeLabel:   string;
  badgeBg:      string;
  badgeBorder:  string;
  badgeColor:   string;
  BadgeIcon:    any;
  location:     string;
  whyItMatters: string;
  inspectorNote: string;
}

function getPhotoMeta(entry: PhotoEntry, pathKey: PathKey): PhotoMeta {
  const cat  = classifyPhoto(entry);
  const location     = entry.section || entry.caption || "Roof Surface";
  const inspectorNote = entry.description || (entry.photo as any)?.description || "Documented during exterior inspection.";

  const base: Record<PhotoCategory, Omit<PhotoMeta, "location" | "inspectorNote">> = {
    storm:       { badgeLabel: "Storm Evidence",      badgeBg: BADGE.neutral.bg,       badgeBorder: BADGE.neutral.border,     badgeColor: BADGE.neutral.text,      BadgeIcon: CloudLightning, whyItMatters: pathKey === "carrier_review" ? "Supports the carrier review recommendation and provides documentation a carrier inspection requires." : "Documents storm-related impact on the property surface." },
    urgent:      { badgeLabel: "Urgent Protection",   badgeBg: BADGE.urgent.bg,        badgeBorder: BADGE.urgent.border,      badgeColor: BADGE.urgent.text,       BadgeIcon: ShieldAlert,    whyItMatters: "Creates a near-term risk of water entry or additional property damage. Should not wait on a larger decision." },
    repair:      { badgeLabel: "Repair Item",          badgeBg: BADGE.neutral.bg,       badgeBorder: BADGE.neutral.border,     badgeColor: "#A8BFFF",               BadgeIcon: Wrench,         whyItMatters: "Documented condition that can be addressed with a targeted repair. Does not require a full system decision." },
    maintenance: { badgeLabel: "Maintenance",          badgeBg: BADGE.maintenance.bg,   badgeBorder: BADGE.maintenance.border, badgeColor: BADGE.maintenance.text,  BadgeIcon: Hammer,         whyItMatters: "Does not support an insurance action today. Should be addressed to protect system life and drainage." },
    monitor:     { badgeLabel: "Monitor",              badgeBg: BADGE.maintenance.bg,   badgeBorder: BADGE.maintenance.border, badgeColor: BADGE.maintenance.text,  BadgeIcon: Eye,            whyItMatters: "No action required today. Documented as a baseline for comparison after any future storm event." },
    overview:    { badgeLabel: "Documentation",        badgeBg: "rgba(255,255,255,0.05)",badgeBorder:"rgba(255,255,255,0.12)", badgeColor: "rgba(255,255,255,0.48)",BadgeIcon: Camera,         whyItMatters: "General property and roof surface context for the inspection record." },
  };

  return { ...base[cat], location, inspectorNote };
}

function sortPhotosForProof(photos: PhotoEntry[], pathKey: PathKey): PhotoEntry[] {
  const p: Record<PhotoCategory, number> = { urgent: 0, storm: pathKey === "carrier_review" ? 1 : 3, repair: pathKey === "urgent_repair" ? 1 : 4, maintenance: 5, monitor: 6, overview: 7 };
  return [...photos].sort((a, b) => p[classifyPhoto(a)] - p[classifyPhoto(b)]);
}

// ── Content configuration ─────────────────────────────────────────────────────

interface PageConfig {
  headline:       string;
  subhead:        string;
  badgeLabel:     string;
  BadgeIcon:      any;
  theme:          "blue" | "red" | "green";
  whatMeans:      string;
  nextStep:       string;
  credibilityLines: string[];
  proofSectionLabel: string;
  showWeatherBlock: boolean;
  repOpeningComment: string;
  repGuidedQs:    [string, string, string];
  repGuardrail:   string;
  repTransition:  string;
  ctaLabel:       string;
}

const PAGE_CONFIGS: Record<PathKey, PageConfig> = {
  carrier_review: {
    headline: "Storm findings documented.\nCarrier review is the\nrecommended next step.",
    subhead: "Hustad completed an exterior inspection and documented conditions consistent with storm-related impact. These findings do not determine insurance coverage, but they are strong enough to justify a formal carrier review before any out-of-pocket expense.",
    badgeLabel: "Carrier Review Candidate",
    BadgeIcon: FileText,
    theme: "blue",
    whatMeans: "The roof is currently serviceable. The documented storm indicators, including impacts to shingles, soft metals, and related surfaces, are the type of evidence carriers evaluate during a claim review. This finding does not guarantee coverage. It means the evidence supports asking the question.",
    nextStep: "Review the strongest proof photos together. Confirm that what you're seeing matches the documented findings. Then decide whether you'd like Hustad to prepare the documentation package and coordinate a carrier inspection.",
    credibilityLines: [
      "We are not saying your carrier has approved coverage.",
      "We are not saying every exterior condition is storm related.",
      "We are not asking you to make a repair decision without seeing the evidence.",
      "We are saying the documented findings are strong enough to justify the recommended next step.",
    ],
    proofSectionLabel: "Storm Evidence: Strongest Proof Photos",
    showWeatherBlock: true,
    repOpeningComment: "What I'd like to do is walk you through what we actually found on your roof, and let the photos do the talking first. I'll explain each one, then we can talk about what it means.",
    repGuidedQs: [
      "Looking at what you're seeing here: does this match what you expected, or is it different from what you thought?",
      "Before I explain the recommended next step: do you have any questions about what you're looking at in these photos?",
      "Based on what's documented here, would it be helpful to understand what happens if we submit this for a carrier review?",
    ],
    repGuardrail: "Do not discuss coverage probability, approval odds, or claim dollar amounts. You are presenting findings and recommending a next step, not predicting an outcome. Stay on the evidence. Let the photos do the work.",
    repTransition: "Once they've confirmed they understand the findings and asked their questions, say: \"Let me show you what the carrier review path actually looks like and what it would involve.\" Then advance to Page 14.",
    ctaLabel: "Review the Carrier Path",
  },
  urgent_repair: {
    headline: "Urgent condition documented.\nImmediately protection or\nrepair is recommended.",
    subhead: "Hustad completed an exterior inspection and documented one or more conditions that create a near-term risk of water entry or additional property damage. These findings should be addressed before waiting on a larger project or coverage decision.",
    badgeLabel: "Urgent Protection: Action Required",
    BadgeIcon: ShieldAlert,
    theme: "red",
    whatMeans: "One or more documented exterior conditions are not a future planning item. They are creating risk today. Immediate protective repair or stabilization is recommended to prevent additional damage. This scope is limited to what the evidence supports. Nothing more.",
    nextStep: "Review the urgent proof photos first. Confirm the documented condition with your rep. Then authorize protective work if you're comfortable, and decide separately whether a broader inspection, repair, or carrier review is appropriate.",
    credibilityLines: [
      "We are not saying every condition requires full replacement.",
      "We are not asking you to approve more than the evidence supports.",
      "We are saying the documented condition has a clear repair or protection path.",
    ],
    proofSectionLabel: "Urgent Findings: Critical Documentation",
    showWeatherBlock: false,
    repOpeningComment: "I want to show you what I found up there. One item in particular that I'd recommend you see first, because it shouldn't wait. I'll walk you through it, and then we can talk about what to do.",
    repGuidedQs: [
      "Looking at that photo: does that location or condition match anything you've noticed from inside the home?",
      "I want to make sure this makes sense before we talk next steps. Are you clear on what you're seeing here?",
      "Would you want to address just this item first, or would it help to see the full scope before deciding?",
    ],
    repGuardrail: "Do not discuss full replacement or insurance until they have acknowledged the urgent finding and agreed it needs attention. Scope first, then cost, then broader options. Do not expand the conversation until the urgent item is understood.",
    repTransition: "Once they've confirmed they understand the urgent finding, say: \"Let me show you what addressing this looks like, and we'll keep it focused on what the evidence actually supports.\" Then advance to Page 14.",
    ctaLabel: "Review the Recommended Path",
  },
  no_action: {
    headline: "Inspection complete.\nNo action is recommended\ntoday.",
    subhead: "Hustad completed a thorough exterior inspection and did not document meaningful storm-related conditions that support repair, emergency action, or carrier review at this time. All findings have been organized and documented for your property records.",
    badgeLabel: "No Action Required Today",
    BadgeIcon: CheckCircle2,
    theme: "green",
    whatMeans: "Today's inspection did not reveal conditions that support a repair, protection, or carrier review recommendation. Any monitor-only or maintenance items have been documented as a baseline for future comparison. This is an honest finding, and it has real value as a dated property record.",
    nextStep: "Review any monitor items or maintenance notes together. Save this report as your property baseline. Decide whether you'd like a future recheck reminder, and know that if conditions change after a future storm event, you have a documented starting point.",
    credibilityLines: [
      "We are not saying your roof is perfect forever.",
      "We are not saying every condition needs action today.",
      "We are not asking you to make a repair or claim decision without a clear reason.",
      "We are saying the best next step today is documentation and monitoring.",
    ],
    proofSectionLabel: "Inspection Documentation: Property Record",
    showWeatherBlock: false,
    repOpeningComment: "Good news: what I found today doesn't support a repair or claim recommendation. I want to show you what we documented, because even a no-action finding has real value when it's organized and saved to your property record.",
    repGuidedQs: [
      "Does it help to have this inspection documented, even when there's no action to take today?",
      "Are there any areas of the property you'd like me to watch more closely going forward?",
      "Would you like us to schedule a future recheck? If there's a storm event, you'll have a before-and-after comparison.",
    ],
    repGuardrail: "Do not over-explain or look for problems that aren't there. Do not offer services the evidence doesn't support. This is a genuine no-action finding. Honor it. Your credibility is the deliverable today.",
    repTransition: "Offer the deliverables and recheck reminder. That's all that's needed. Say: \"Let me show you what we'll send you and what comes next.\" Then advance to Page 14.",
    ctaLabel: "Review Your Property Deliverables",
  },
};

// ── Design tokens ─────────────────────────────────────────────────────────────

const DS = {
  // Page background — spec-exact cinematic deep navy
  pageBg: {
    background: [
      "radial-gradient(circle at top right,    rgba(61,90,254,0.20),  transparent 28%)",
      "radial-gradient(circle at left center,  rgba(139,92,255,0.10), transparent 34%)",
      "radial-gradient(circle at bottom center,rgba(77,111,255,0.08), transparent 40%)",
      "linear-gradient(180deg, #081120 0%, #050816 100%)",
    ].join(", "),
  } as React.CSSProperties,

  // Standard glass card — slightly more opaque for color pop
  card: {
    background: "linear-gradient(180deg, rgba(20,32,58,0.88) 0%, rgba(10,16,32,0.96) 100%)",
    border: "1px solid rgba(255,255,255,0.11)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.50), 0 0 40px rgba(77,111,255,0.08)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "20px",
  } as React.CSSProperties,

  // Typography
  text: {
    primary:   "#F5F7FA",
    secondary: "rgba(255,255,255,0.72)",
    muted:     "rgba(255,255,255,0.48)",
    faint:     "rgba(255,255,255,0.28)",
  },

  // Themed accents by path
  theme: {
    blue: {
      accent:         "#5B7FFF",
      accentSoft:     "rgba(91,127,255,0.18)",
      accentBorder:   "rgba(91,127,255,0.32)",
      accentGlow:     "rgba(91,127,255,0.14)",
      badgeBg:        "rgba(91,127,255,0.15)",
      badgeBorder:    "rgba(91,127,255,0.38)",
      badgeText:      "#a8c0ff",
      cardBorder:     "rgba(91,127,255,0.28)",
      cardGlow:       "rgba(91,127,255,0.14)",
      btnGrad:        "linear-gradient(90deg, #4A6FFF, #7B61FF, #9B5BFF)",
      btnGlow:        "0 8px 32px rgba(77,111,255,0.50)",
      iconBg:         "rgba(91,127,255,0.14)",
      recheckActive:  "background: rgba(91,127,255,0.18); border-color: rgba(91,127,255,0.45);",
    },
    red: {
      accent:         "#FF5A6B",
      accentSoft:     "rgba(255,90,107,0.18)",
      accentBorder:   "rgba(255,90,107,0.30)",
      accentGlow:     "rgba(255,90,107,0.12)",
      badgeBg:        "rgba(255,90,107,0.15)",
      badgeBorder:    "rgba(255,90,107,0.38)",
      badgeText:      "#ffb0b8",
      cardBorder:     "rgba(255,90,107,0.28)",
      cardGlow:       "rgba(255,90,107,0.12)",
      btnGrad:        "linear-gradient(90deg, #FF5A6B, #FF4D8D, #FF3D99)",
      btnGlow:        "0 8px 32px rgba(255,90,107,0.50)",
      iconBg:         "rgba(255,90,107,0.14)",
      recheckActive:  "background: rgba(255,90,107,0.18); border-color: rgba(255,90,107,0.45);",
    },
    green: {
      accent:         "#43D17D",
      accentSoft:     "rgba(67,209,125,0.16)",
      accentBorder:   "rgba(67,209,125,0.28)",
      accentGlow:     "rgba(67,209,125,0.10)",
      badgeBg:        "rgba(67,209,125,0.13)",
      badgeBorder:    "rgba(67,209,125,0.35)",
      badgeText:      "#9de8c0",
      cardBorder:     "rgba(67,209,125,0.24)",
      cardGlow:       "rgba(67,209,125,0.10)",
      btnGrad:        "linear-gradient(90deg, #43D17D, #2EC09A, #1BB5B0)",
      btnGlow:        "0 8px 32px rgba(67,209,125,0.45)",
      iconBg:         "rgba(67,209,125,0.14)",
      recheckActive:  "background: rgba(67,209,125,0.18); border-color: rgba(67,209,125,0.45);",
    },
  },
};

// Helper — themed card with accent glow
function themedCard(tk: typeof DS.theme[keyof typeof DS.theme]): React.CSSProperties {
  return {
    background: "linear-gradient(180deg, rgba(20,32,58,0.90) 0%, rgba(10,16,32,0.97) 100%)",
    border: `1px solid ${tk.cardBorder}`,
    boxShadow: `0 20px 60px rgba(0,0,0,0.50), 0 0 80px ${tk.cardGlow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "20px",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Semantic badge color tokens — spec-exact
// ─────────────────────────────────────────────────────────────────────────────

const BADGE = {
  neutral: {
    bg:     "rgba(77,111,255,0.14)",
    border: "rgba(77,111,255,0.22)",
    text:   "#8AA7FF",
    glow:   "0 0 18px rgba(77,111,255,0.12)",
  },
  urgent: {
    bg:     "rgba(255,90,107,0.14)",
    border: "rgba(255,90,107,0.24)",
    text:   "#FF96A1",
    glow:   "0 0 18px rgba(255,90,107,0.12)",
  },
  maintenance: {
    bg:     "rgba(255,184,77,0.14)",
    border: "rgba(255,184,77,0.24)",
    text:   "#FFC774",
    glow:   "0 0 18px rgba(255,184,77,0.10)",
  },
  success: {
    bg:     "rgba(67,209,125,0.14)",
    border: "rgba(67,209,125,0.22)",
    text:   "#79E5A2",
    glow:   "0 0 18px rgba(67,209,125,0.10)",
  },
} as const;

type BadgeVariant = keyof typeof BADGE;

// ── SemanticBadge — pill-shaped, glassmorphism, animated hover glow ───────────

function SemanticBadge({
  icon: Icon, label, variant = "neutral", size = "md",
}: {
  icon: any;
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
}) {
  const [hovered, setHovered] = useState(false);
  const t = BADGE[variant];
  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="inline-flex items-center gap-1.5 cursor-default select-none whitespace-nowrap"
      style={{
        height:              size === "sm" ? "28px" : "32px",
        padding:             size === "sm" ? "0 10px" : "0 14px",
        borderRadius:        "999px",
        background:          t.bg,
        border:              `1px solid ${hovered ? t.text.replace(")", ", 0.45)").replace("rgb", "rgba") : t.border}`,
        color:               t.text,
        backdropFilter:      "blur(10px)",
        WebkitBackdropFilter:"blur(10px)",
        boxShadow:           hovered ? t.glow : "none",
        transition:          "box-shadow 0.25s ease, border-color 0.25s ease",
        fontFamily:          "'Inter', system-ui, sans-serif",
        fontSize:            size === "sm" ? "11px" : "12.5px",
        fontWeight:          500,
        letterSpacing:       "0.2px",
      }}
    >
      <Icon size={size === "sm" ? 10 : 11} strokeWidth={1.8} />
      <span>{label}</span>
    </motion.div>
  );
}

// ── MicroLabel — uppercase section headings ───────────────────────────────────

function MicroLabel({
  children, icon: Icon, accent,
}: {
  children: React.ReactNode;
  icon?: any;
  accent?: string;
}) {
  const color = accent || "rgba(130,160,255,0.75)";
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon size={13} strokeWidth={1.5} style={{ color }} />}
      <span style={{
        fontFamily:    "'Inter', system-ui, sans-serif",
        fontSize:      "11px",
        letterSpacing: "2px",
        textTransform: "uppercase",
        color,
        fontWeight:    500,
      }}>
        {children}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// B12FindingsSummary
// ─────────────────────────────────────────────────────────────────────────────

export function B12FindingsSummary({ session, onUpdate, onNext, onBack, onRepJump }: Props) {
  const { findings } = session;
  const outcome  = findings.outcomeType ?? "no_damage";
  const pathKey  = derivePathKey(outcome, findings.urgentItemsCount);
  const config   = PAGE_CONFIGS[pathKey];
  const tk       = DS.theme[config.theme];

  // ── State ──────────────────────────────────────────────────────────────────
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [activePhotoIndex,  setActivePhotoIndex]  = useState<number | null>(null);
  const [showRecheckModal,  setShowRecheckModal]  = useState(false);
  const [selectedMonths,    setSelectedMonths]    = useState<number | null>(null);
  const [recheckConfirmed,  setRecheckConfirmed]  = useState(false);
  const [showCompanion,     setShowCompanion]     = useState(false);
  const [companionAnswers,  setCompanionAnswers]  = useState({ q1: "", q2: "", q3: "" });
  const [companionSaved,    setCompanionSaved]    = useState(false);
  const [secondaryExpanded, setSecondaryExpanded] = useState(false);

  // ── Photos ─────────────────────────────────────────────────────────────────
  const allPhotos    = buildPhotoList(session);
  const sortedPhotos = sortPhotosForProof(allPhotos, pathKey);
  const proofPhotos  = sortedPhotos.slice(0, 6);
  const secondaryPhotos = sortedPhotos.slice(6);

  // ── Display values ─────────────────────────────────────────────────────────
  const inspectionDate = session.createdAt
    ? new Date(session.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";
  const stormEventDate = session.property?.workingDateOfLoss
    ? new Date(session.property.workingDateOfLoss).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  // ── Stats — per-type colors (urgent=red, storm=blue, monitor=amber) ──────────
  const stats = [
    {
      label:     findings.urgentItemsCount > 0 ? "Urgent" : pathKey === "carrier_review" ? "Storm" : "Findings",
      value:     findings.urgentItemsCount > 0 ? findings.urgentItemsCount : findings.stormRelatedItemsCount,
      numColor:  findings.urgentItemsCount > 0 ? "#FF5A6B" : pathKey === "carrier_review" ? "#4D6FFF" : tk.accent,
      barColor:  findings.urgentItemsCount > 0 ? "#FF5A6B" : pathKey === "carrier_review" ? "#4D6FFF" : tk.accent,
      bg:        findings.urgentItemsCount > 0 ? "rgba(255,90,107,0.10)" : pathKey === "carrier_review" ? "rgba(77,111,255,0.10)" : tk.accentSoft,
      border:    findings.urgentItemsCount > 0 ? "rgba(255,90,107,0.24)" : pathKey === "carrier_review" ? "rgba(77,111,255,0.22)" : tk.accentBorder,
      glow:      findings.urgentItemsCount > 0 ? "rgba(255,90,107,0.12)" : pathKey === "carrier_review" ? "rgba(77,111,255,0.10)" : tk.accentGlow,
    },
    {
      label: "Monitor", value: findings.monitorItemsCount,
      numColor: "#FFC774", barColor: "#FFC774",
      bg: "rgba(255,184,77,0.08)", border: "rgba(255,184,77,0.18)", glow: "rgba(255,184,77,0.06)",
    },
    {
      label: "Photos",  value: allPhotos.length,
      numColor: DS.text.secondary, barColor: "rgba(255,255,255,0.20)",
      bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.08)", glow: "none",
    },
  ];

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleUnlock = () => { const u = unlockSummary(session); onUpdate(u); if (onRepJump) onRepJump("B11_rep_findings_prep"); };
  const confirmRecheck = () => { if (!selectedMonths) return; setRecheckConfirmed(true); setTimeout(() => { setShowRecheckModal(false); setRecheckConfirmed(false); setSelectedMonths(null); }, 2000); };
  const handleSaveCompanion = () => { setCompanionSaved(true); setTimeout(() => setCompanionSaved(false), 2500); };
  const handlePrevPhoto = () => { if (activePhotoIndex !== null) setActivePhotoIndex((activePhotoIndex - 1 + sortedPhotos.length) % sortedPhotos.length); };
  const handleNextPhoto = () => { if (activePhotoIndex !== null) setActivePhotoIndex((activePhotoIndex + 1) % sortedPhotos.length); };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden" style={DS.pageBg}>

      {/* ════════════════════════════════════════════════════════════════════════
          CINEMATIC BACKGROUND — 7 layers deep
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">

        {/* L1 — Film grain noise · soft-light · 3% opacity */}
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize:   "300px 300px",
          opacity:          0.030,
          mixBlendMode:     "soft-light",
        }} />

        {/* L2 — Blueprint technical grid · 4% opacity */}
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cline x1='0' y1='0' x2='60' y2='0' stroke='%234D6FFF' stroke-width='0.35'/%3E%3Cline x1='0' y1='0' x2='0' y2='60' stroke='%234D6FFF' stroke-width='0.35'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize:   "60px 60px",
          opacity:          0.040,
        }} />

        {/* L3 — Edge vignette · depth-framing darkening */}
        <div className="absolute inset-0" style={{
          boxShadow:    "inset 0 0 220px rgba(0,0,0,0.38), inset 0 0 80px rgba(0,0,0,0.20)",
          borderRadius: "0",
        }} />

        {/* L4 — Ambient glow · top-right · themed · 30s drift */}
        <motion.div
          animate={{ scale: [1, 1.12, 1.04, 1], opacity: [0.16, 0.22, 0.18, 0.16] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -right-40 w-[780px] h-[780px] rounded-full"
          style={{
            background: `radial-gradient(circle, ${tk.accentGlow.replace("0.10", "0.28")}, transparent 68%)`,
            filter: "blur(120px)",
          }}
        />

        {/* L5 — Ambient glow · bottom-left · purple · 38s drift */}
        <motion.div
          animate={{ scale: [1, 1.09, 1.05, 1], opacity: [0.10, 0.16, 0.12, 0.10] }}
          transition={{ duration: 38, repeat: Infinity, ease: "easeInOut", delay: 10 }}
          className="absolute -bottom-52 -left-52 w-[680px] h-[680px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(139,92,255,0.22), transparent 68%)",
            filter: "blur(120px)",
          }}
        />

        {/* L6 — Soft blue bloom · top-left accent · 24s drift */}
        <motion.div
          animate={{ scale: [1, 1.07, 1], opacity: [0.07, 0.12, 0.07] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 6 }}
          className="absolute top-16 -left-28 w-[440px] h-[440px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(77,111,255,0.20), transparent 65%)",
            filter: "blur(100px)",
          }}
        />

        {/* L7 — Horizon bloom · center-bottom · very faint · 40s drift */}
        <motion.div
          animate={{ scale: [1, 1.14, 1], opacity: [0.05, 0.09, 0.05] }}
          transition={{ duration: 40, repeat: Infinity, ease: "easeInOut", delay: 18 }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[360px] rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(61,90,254,0.14), transparent 60%)",
            filter: "blur(110px)",
          }}
        />

      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          CINEMATIC HOUSE IMAGE — right-side hero, fades out before cards
          urgent_repair → roof_forensic (forensic shingle detail + analytics)
          carrier_review / no_action → home_aerial (luxury dusk aerial)
      ════════════════════════════════════════════════════════════════════════ */}
      <div
        className="absolute top-0 right-0 w-[62%] pointer-events-none overflow-hidden"
        style={{ zIndex: 2, height: "72vh" }}
      >
        {/* Base image — cinematic dark grading */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pathKey === "urgent_repair" ? "/images/roof_forensic.png" : "/images/home_aerial.png"}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            objectPosition: pathKey === "urgent_repair" ? "center 40%" : "center 30%",
            filter: "brightness(0.42) contrast(1.12) saturate(0.78) hue-rotate(-8deg)",
          }}
        />

        {/* Overlay A — left fade: full opacity to transparent, keeps left text readable */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(90deg, rgba(5,8,22,1) 0%, rgba(5,8,22,0.92) 30%, rgba(5,8,22,0.62) 58%, rgba(5,8,22,0.18) 100%)",
        }} />

        {/* Overlay B — top vignette + heavy bottom fade into page */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, rgba(5,8,22,0.55) 0%, transparent 22%, transparent 55%, rgba(5,8,22,0.92) 82%, rgba(5,8,22,1) 100%)",
        }} />

        {/* Overlay C — blue atmospheric glow: ties image into design system */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(circle at center right, rgba(61,90,254,0.18), transparent 40%)",
        }} />

        {/* Overlay D — path-specific atmospheric tint */}
        <div className="absolute inset-0" style={{
          background: pathKey === "urgent_repair"
            ? "linear-gradient(180deg, rgba(255,60,80,0.06) 0%, transparent 50%)"
            : "linear-gradient(180deg, rgba(10,18,48,0.28) 0%, transparent 45%)",
        }} />

      </div>

      {/* ── Logo ────────────────────────────────────────────────────────────── */}
      <div className="absolute top-9 left-10 z-30 hidden lg:flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-editorial font-medium tracking-[0.06em]" style={{ color: DS.text.primary, fontSize: "22px" }}>HUSTAD</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.28em]" style={{ color: DS.text.faint }}>Madison Residential</span>
        </div>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────────────── */}
      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="B12_findings_summary" phase="B" />
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MAIN SCROLLABLE BODY
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-10 pt-8 pb-52 min-h-0">
        <div className="max-w-5xl mx-auto space-y-10">

          {/* ── § 1  HERO: Classification + Headline ───────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-7 pb-10"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-6 flex-1">

                {/* Classification pill */}
                <div className="flex items-center gap-2.5 w-fit px-4 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-[0.18em]"
                     style={{ background: tk.badgeBg, border: `1px solid ${tk.badgeBorder}`, color: tk.badgeText, backdropFilter: "blur(10px)" }}>
                  <config.BadgeIcon size={12} strokeWidth={1.5} />
                  <span className="pt-px">{config.badgeLabel}</span>
                </div>

                {/* Semantic badge cluster */}
                <div className="flex flex-wrap gap-2">
                  {pathKey === "carrier_review" && (
                    <>
                      <SemanticBadge icon={CloudLightning} label="Storm Evidence"        variant="neutral" />
                      <SemanticBadge icon={Shield}         label="Claim Review"          variant="neutral" />
                      <SemanticBadge icon={Home}           label="Roof Longevity"        variant="success" />
                      <SemanticBadge icon={FileCheck}      label="Insurance Process"     variant="neutral" />
                    </>
                  )}
                  {pathKey === "urgent_repair" && (
                    <>
                      <SemanticBadge icon={ShieldAlert}    label="Urgent Protection"     variant="urgent"      />
                      <SemanticBadge icon={Zap}            label="Repair Speed"          variant="urgent"      />
                      <SemanticBadge icon={Wrench}         label="Repair Item"           variant="maintenance" />
                      <SemanticBadge icon={Sparkles}       label="Minimal Disruption"    variant="success"     />
                    </>
                  )}
                  {pathKey === "no_action" && (
                    <>
                      <SemanticBadge icon={Eye}            label="Monitor"               variant="maintenance" />
                      <SemanticBadge icon={Home}           label="Roof Longevity"        variant="success"     />
                      <SemanticBadge icon={Hammer}         label="Maintenance"           variant="maintenance" />
                      <SemanticBadge icon={FileCheck}      label="Documentation"         variant="neutral"     />
                    </>
                  )}
                </div>

                {/* Editorial headline — Cormorant Garamond */}
                <h1
                  className="font-editorial font-medium"
                  style={{
                    color:          DS.text.primary,
                    fontSize:       "clamp(44px, 5.5vw, 78px)",
                    lineHeight:     0.93,
                    letterSpacing:  "-0.02em",
                    whiteSpace:     "pre-line",
                  }}
                >
                  {config.headline}
                </h1>

                <p className="font-inter text-[15px] leading-[1.7] max-w-2xl" style={{ color: DS.text.secondary }}>
                  {config.subhead}
                </p>

                {/* Audit badge */}
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: DS.text.faint }}>
                  <CheckCircle2 size={13} strokeWidth={1.5} style={{ color: tk.accent }} />
                  <span>Summary locked and audited · Findings are immutable</span>
                </div>
              </div>

              {session.mode === "rep" && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowUnlockConfirm(true)}
                  className="flex items-center gap-2 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] shrink-0 mt-2"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "10px", color: DS.text.muted, backdropFilter: "blur(12px)" }}
                >
                  <Unlock size={13} strokeWidth={1.5} />
                  <span>Unlock</span>
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* ── § 2  Property Details + Finding Stats ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Property & Inspection */}
            <div style={DS.card} className="p-7 space-y-5">
              <MicroLabel icon={MapPin} accent={tk.accent}>Property &amp; Inspection Details</MicroLabel>
              {/* Ultra-thin separator */}
              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
              <div className="space-y-3.5 font-inter text-[13px]">
                {[
                  { label: "Property",          value: session.property?.address },
                  { label: "Inspection Date",   value: inspectionDate },
                  ...(stormEventDate ? [{ label: "Storm Event Date", value: stormEventDate }] : []),
                  { label: "Inspector",         value: session.repName || "" },
                  ...(session.property?.stormBasis ? [{ label: "Storm Basis", value: session.property.stormBasis }] : []),
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-start gap-4">
                    <span style={{ color: DS.text.muted }}>{row.label}</span>
                    <span className="font-medium text-right" style={{ color: DS.text.primary }}>{row.value || ""}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Finding Stats — premium metric widgets */}
            <div style={DS.card} className="p-7 space-y-5">
              <MicroLabel icon={Layers} accent={tk.accent}>Finding Summary</MicroLabel>
              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
              <div className="grid grid-cols-3 gap-3">
                {stats.map((s) => (
                  <div key={s.label} className="flex flex-col items-center justify-center py-5 px-2 rounded-[16px] relative overflow-hidden"
                       style={{
                         background: s.bg,
                         border:     `1px solid ${s.border}`,
                         boxShadow:  s.glow !== "none" ? `inset 0 0 28px ${s.glow}` : "none",
                       }}>
                    {/* Top color bar */}
                    <div className="absolute top-0 inset-x-0 h-[2.5px]"
                         style={{ background: s.barColor }} />
                    {/* Large metric number */}
                    <p className="font-inter font-light leading-none tabular-nums"
                       style={{ fontSize: "54px", color: s.numColor, lineHeight: 1, letterSpacing: "-0.02em" }}>
                      {s.value ?? 0}
                    </p>
                    {/* Uppercase label */}
                    <p className="mt-2.5 font-inter font-semibold"
                       style={{ fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: s.numColor, opacity: 0.85 }}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              {session.buyerData?.buyerPriorities && session.buyerData.buyerPriorities.length > 0 && (
                <div className="pt-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <MicroLabel>Your Stated Priorities</MicroLabel>
                  <div className="flex flex-wrap gap-2">
                    {session.buyerData.buyerPriorities.map(p => (
                      <SemanticBadge
                        key={p}
                        icon={Sparkles}
                        label={p.replace(/_/g, " ")}
                        variant="neutral"
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── § 3  Weather Event Block ────────────────────────────────────── */}
          {config.showWeatherBlock && (findings.stormSummary || (findings.weatherEvents && findings.weatherEvents.length > 0)) && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
              style={themedCard(tk)}
              className="p-7 space-y-5"
            >
              <div className="flex items-center gap-2.5 flex-wrap">
                <MicroLabel icon={CloudLightning} accent={tk.accent}>Weather Event Support</MicroLabel>
                {stormEventDate && (
                  <span className="ml-auto font-mono text-[10px] px-3 py-1 rounded-full"
                        style={{ background: tk.badgeBg, border: `1px solid ${tk.badgeBorder}`, color: tk.badgeText }}>
                    Event: {stormEventDate}
                  </span>
                )}
              </div>
              {findings.stormSummary && (
                <p className="font-inter text-[13px] leading-relaxed" style={{ color: DS.text.secondary }}>{findings.stormSummary}</p>
              )}
              {findings.weatherEvents && findings.weatherEvents.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {findings.weatherEvents.map((e, i) => (
                    <div key={i} className="p-4 space-y-2 rounded-[14px]"
                         style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: tk.accent }}>{e.time}</span>
                      <p className="font-inter text-[13px] font-medium" style={{ color: DS.text.primary }}>{e.reference}</p>
                      <p className="font-inter text-[12px] italic leading-relaxed" style={{ color: DS.text.muted }}>{e.relevance}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
          )}

          {/* ── § 4  Photo Evidence ────────────────────────────────────────── */}
          <section className="space-y-6">
            <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <MicroLabel icon={Camera} accent={tk.accent}>{config.proofSectionLabel}</MicroLabel>
              <span className="font-mono text-[10px]" style={{ color: DS.text.faint }}>
                {proofPhotos.length} of {allPhotos.length} shown · All in PDF
              </span>
            </div>

            {proofPhotos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {proofPhotos.map((photo, index) => {
                  const meta = getPhotoMeta(photo, pathKey);
                  const BadgeIcon = meta.BadgeIcon;
                  return (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
                      whileHover={{
                        y: -4,
                        boxShadow: `0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px ${meta.badgeBorder}, 0 0 32px ${meta.badgeBg}`,
                        transition: { duration: 0.22 },
                      }}
                      onClick={() => setActivePhotoIndex(index)}
                      className="flex flex-col cursor-pointer overflow-hidden group"
                      style={{
                        background:           "linear-gradient(180deg, rgba(14,22,44,0.82) 0%, rgba(6,10,20,0.96) 100%)",
                        border:               "1px solid rgba(255,255,255,0.07)",
                        boxShadow:            "0 16px 48px rgba(0,0,0,0.40)",
                        backdropFilter:       "blur(14px)",
                        WebkitBackdropFilter: "blur(14px)",
                        borderRadius:         "18px",
                      }}
                    >
                      {/* Cinematic 16:9 image */}
                      <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
                        {photo.type === "structured" && photo.photo ? (
                          <PhotoThumbnail photo={photo.photo} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                        ) : photo.url ? (
                          <img src={photo.url} alt="Finding" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.02)" }}>
                            <Camera size={24} strokeWidth={1} style={{ color: DS.text.faint }} />
                          </div>
                        )}
                        {/* Cinematic overlay — spec-exact */}
                        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.82))" }} />
                        {/* Top-left floating badge */}
                        <div className="absolute top-3 left-3">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-inter font-medium"
                               style={{
                                 background:          meta.badgeBg,
                                 border:              `1px solid ${meta.badgeBorder}`,
                                 color:               meta.badgeColor,
                                 backdropFilter:      "blur(10px)",
                                 WebkitBackdropFilter:"blur(10px)",
                                 fontSize:            "11px",
                                 letterSpacing:       "0.2px",
                               }}>
                            <BadgeIcon size={10} strokeWidth={1.8} />
                            <span>{meta.badgeLabel}</span>
                          </div>
                        </div>
                        {/* Bottom-left title + location */}
                        <div className="absolute bottom-3 left-3 right-10">
                          <p className="font-inter font-medium text-[13px] text-white leading-tight truncate">
                            {photo.caption || photo.photo?.label || meta.badgeLabel}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <MapPin size={10} strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.55)" }} />
                            <p className="font-mono text-[10px] truncate" style={{ color: "rgba(255,255,255,0.55)", letterSpacing: "0.5px" }}>
                              {meta.location}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card metadata — 3-field editorial layout */}
                      <div className="p-5 space-y-4 flex-1">
                        {/* Why it matters */}
                        <div className="space-y-1.5">
                          <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
                          <p style={{ fontFamily: "'Inter', system-ui", fontSize: "10px", letterSpacing: "1.8px", textTransform: "uppercase", color: "rgba(130,160,255,0.70)", fontWeight: 500 }}>
                            Why It Matters
                          </p>
                          <p className="font-inter text-[12px] leading-[1.6]" style={{ color: DS.text.secondary }}>{meta.whyItMatters}</p>
                        </div>
                        {/* Inspector note */}
                        <div className="space-y-1.5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <p style={{ fontFamily: "'Inter', system-ui", fontSize: "10px", letterSpacing: "1.8px", textTransform: "uppercase", color: "rgba(130,160,255,0.70)", fontWeight: 500 }}>
                            Inspector Note
                          </p>
                          <p className="font-inter text-[11.5px] leading-relaxed italic" style={{ color: DS.text.muted }}>"{meta.inspectorNote}"</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-[18px] flex items-center justify-center"
                       style={{ aspectRatio: "16/9", border: "1px dashed rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.01)" }}>
                    <Camera size={22} strokeWidth={1} style={{ color: DS.text.faint }} />
                  </div>
                ))}
              </div>
            )}

            {/* Expandable secondary photos */}
            {secondaryPhotos.length > 0 && (
              <div className="space-y-4">
                <button
                  onClick={() => setSecondaryExpanded(!secondaryExpanded)}
                  className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-opacity hover:opacity-80"
                  style={{ color: DS.text.faint }}
                >
                  {secondaryExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  <span>{pathKey === "no_action" ? "Monitor & Maintenance Documentation" : "Additional Documentation"}: {secondaryPhotos.length} photo{secondaryPhotos.length !== 1 ? "s" : ""}</span>
                  <span style={{ opacity: 0.4, textTransform: "none", letterSpacing: "normal" }}>(all in PDF report)</span>
                </button>
                <AnimatePresence>
                  {secondaryExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                        {secondaryPhotos.map((photo, index) => {
                          const meta = getPhotoMeta(photo, pathKey);
                          const BadgeIcon = meta.BadgeIcon;
                          return (
                            <div key={photo.id} onClick={() => setActivePhotoIndex(proofPhotos.length + index)}
                                 className="overflow-hidden cursor-pointer rounded-[14px]"
                                 style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                              <div className="relative overflow-hidden" style={{ aspectRatio: "1/1" }}>
                                {photo.type === "structured" && photo.photo ? (
                                  <PhotoThumbnail photo={photo.photo} className="w-full h-full object-cover" />
                                ) : photo.url ? (
                                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                                ) : null}
                                <div className="absolute top-1.5 left-1.5">
                                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[7px] uppercase tracking-wider"
                                       style={{ background: meta.badgeBg, border: `1px solid ${meta.badgeBorder}`, color: meta.badgeColor, backdropFilter: "blur(8px)" }}>
                                    <BadgeIcon size={8} strokeWidth={1.5} />
                                    <span>{meta.badgeLabel}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="p-2.5">
                                <p className="font-inter text-[11px] leading-snug" style={{ color: DS.text.muted }}>{photo.caption || "Documentation"}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* ── § 5-7  What This Means + Credibility ───────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* What This Means + Next Step */}
            <div className="lg:col-span-7" style={{ ...themedCard(tk), padding: "32px" }}>
              <div className="space-y-7 relative">
                {/* Background shield watermark */}
                <div className="absolute top-0 right-0 opacity-[0.04] pointer-events-none">
                  <Shield size={100} strokeWidth={0.6} style={{ color: tk.accent }} />
                </div>
                <div>
                  <MicroLabel accent={tk.accent}>Official Recommendation</MicroLabel>
                  <p className="font-editorial font-medium text-2xl mt-2" style={{ color: tk.accent, lineHeight: 1.1, letterSpacing: "-0.01em" }}>{config.badgeLabel}</p>
                </div>
                <div className="space-y-6 pt-5" style={{ borderTop: `1px solid ${tk.accentBorder}` }}>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: tk.iconBg }}>
                      <ShieldCheck size={15} strokeWidth={1.5} style={{ color: tk.accent }} />
                    </div>
                    <div className="space-y-1.5">
                      <MicroLabel accent={tk.accent}>What This Means</MicroLabel>
                      <p className="font-inter text-[13px] leading-relaxed" style={{ color: DS.text.secondary }}>{config.whatMeans}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: tk.iconBg }}>
                      <ArrowRight size={15} strokeWidth={1.5} style={{ color: tk.accent }} />
                    </div>
                    <div className="space-y-1.5">
                      <MicroLabel accent={tk.accent}>Recommended Next Step</MicroLabel>
                      <p className="font-inter text-[13px] leading-relaxed" style={{ color: DS.text.secondary }}>{config.nextStep}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Credibility Block */}
            <div className="lg:col-span-5" style={{ ...DS.card, padding: "32px" }}>
              <div className="space-y-5 h-full">
                <MicroLabel accent={tk.accent}>What We Are Not Saying</MicroLabel>
                <div className="space-y-4">
                  {config.credibilityLines.map((line, i) => {
                    const isPositive = line.startsWith("We are saying");
                    return (
                      <div key={i} className="flex items-start gap-3">
                        {isPositive
                          ? <CheckCircle2 size={14} strokeWidth={1.5} className="shrink-0 mt-0.5" style={{ color: tk.accent, opacity: 0.85 }} />
                          : <XCircle     size={14} strokeWidth={1.5} className="shrink-0 mt-0.5" style={{ color: "#FF5A6B", opacity: 0.60 }} />
                        }
                        <p className="font-inter text-[13px] leading-relaxed"
                           style={{ color: isPositive ? DS.text.primary : DS.text.secondary }}>
                          {line}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── § 8  Guided Questions ──────────────────────────────────────── */}
          <section className="space-y-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <MicroLabel icon={MessageCircle} accent={tk.accent}>Rep-Guided Questions</MicroLabel>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {config.repGuidedQs.map((q, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -2, transition: { duration: 0.18 } }}
                  style={DS.card}
                  className="p-6 space-y-3"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold"
                       style={{ background: tk.iconBg, color: tk.accent }}>{i + 1}</div>
                  <p className="font-inter text-[13px] leading-relaxed" style={{ color: DS.text.secondary }}>{q}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ── Recheck CTA (no_action) ────────────────────────────────────── */}
          {pathKey === "no_action" && (
            <div className="flex items-center justify-between gap-6 p-5 rounded-[16px]"
                 style={{ background: "rgba(67,209,125,0.06)", border: "1px solid rgba(67,209,125,0.18)" }}>
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(67,209,125,0.12)" }}>
                  <Calendar size={16} strokeWidth={1.5} style={{ color: "#43D17D" }} />
                </div>
                <div>
                  <p className="font-inter font-medium text-[13px]" style={{ color: DS.text.primary }}>Schedule a Future Recheck</p>
                  <p className="font-inter text-[11px] mt-0.5" style={{ color: DS.text.muted }}>Set a free reminder so you have a comparison baseline after any future storm event.</p>
                </div>
              </div>
              <button onClick={() => setShowRecheckModal(true)}
                      className="px-4 py-2 rounded-xl font-mono text-[9px] uppercase tracking-[0.16em] shrink-0 transition-opacity hover:opacity-80 active:scale-95"
                      style={{ background: "rgba(67,209,125,0.12)", border: "1px solid rgba(67,209,125,0.30)", color: "#43D17D" }}>
                Set Reminder
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          BOTTOM CTA BAR — premium gradient button
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="absolute bottom-0 inset-x-0 z-30 px-6 md:px-10 pb-8 pt-20"
           style={{ background: "linear-gradient(to top, #050816 60%, transparent)" }}>
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex items-center gap-4">
            {/* Back — glass secondary */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onBack}
              className="flex items-center gap-2.5 px-7 font-inter font-medium text-[14px] shrink-0"
              style={{
                background:         "rgba(255,255,255,0.05)",
                border:             "1px solid rgba(255,255,255,0.10)",
                backdropFilter:     "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                height:             "56px",
                borderRadius:       "14px",
                color:              DS.text.secondary,
              }}
            >
              <ArrowLeft size={16} strokeWidth={1.5} />
              <span>Previous</span>
            </motion.button>

            {/* Primary CTA — luxury gradient */}
            <motion.button
              whileHover={{ scale: 1.015, filter: "brightness(1.08)" }}
              whileTap={{ scale: 0.975 }}
              onClick={onNext}
              className="flex-1 flex items-center justify-center gap-3 font-inter font-semibold text-[15px] text-white"
              style={{
                background:   tk.btnGrad,
                boxShadow:    tk.btnGlow,
                height:       "56px",
                borderRadius: "14px",
              }}
            >
              <span>{config.ctaLabel}</span>
              <ChevronRight size={18} strokeWidth={2} />
            </motion.button>
          </div>

          {/* Reassurance line */}
          <div className="flex items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: DS.text.faint }}>
            <CheckCircle2 size={11} strokeWidth={1.5} style={{ color: tk.accent }} />
            <span>You can review everything before making any decision.</span>
          </div>
        </div>
      </div>

      {/* ── Rep Companion FAB ──────────────────────────────────────────────── */}
      {session.mode === "rep" && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.7, type: "spring", stiffness: 260, damping: 22 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowCompanion(true)}
          className="absolute bottom-32 right-6 z-40 w-13 h-13 flex items-center justify-center"
          style={{
            width:        "52px",
            height:       "52px",
            borderRadius: "50%",
            background:   "linear-gradient(135deg, #4D6FFF, #8B5CFF)",
            boxShadow:    "0 8px 28px rgba(77,111,255,0.45)",
          }}
        >
          <BookOpen size={20} strokeWidth={1.5} color="white" />
        </motion.button>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════════════════════ */}

      {/* Unlock Confirm */}
      <AnimatePresence>
        {showUnlockConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[100] flex items-center justify-center px-8"
                      style={{ background: "rgba(2,4,14,0.85)", backdropFilter: "blur(12px)" }}>
            <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
                        className="max-w-md w-full p-10 space-y-8"
                        style={{ ...DS.card, borderRadius: "24px" }}>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(251,191,36,0.12)" }}>
                  <Unlock size={26} strokeWidth={1.5} style={{ color: "#FBB924" }} />
                </div>
                <h2 className="font-editorial font-medium text-2xl" style={{ color: DS.text.primary, letterSpacing: "-0.01em" }}>Unlock findings summary?</h2>
                <p className="font-inter text-[13px] leading-relaxed" style={{ color: DS.text.secondary }}>
                  This will return you to findings prep. The summary will be editable again.
                  <br /><span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "rgba(251,191,36,0.60)" }}>Security Log Entry Required</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowUnlockConfirm(false)}
                        className="flex-1 py-3.5 rounded-xl font-inter font-medium text-[14px] transition-opacity hover:opacity-80"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: DS.text.secondary }}>
                  Cancel
                </button>
                <button onClick={handleUnlock}
                        className="flex-1 py-3.5 rounded-xl font-inter font-bold text-[14px] text-black"
                        style={{ background: "#FBB924", boxShadow: "0 0 24px rgba(251,185,36,0.30)" }}>
                  Unlock & Edit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {activePhotoIndex !== null && sortedPhotos[activePhotoIndex] && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[110] flex flex-col select-none"
                      style={{ background: "rgba(2,4,14,0.97)", backdropFilter: "blur(20px)" }}>
            {/* Top bar */}
            <div className="flex justify-between items-center px-8 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: DS.text.faint }}>
                  Photo {activePhotoIndex + 1} of {sortedPhotos.length}
                </p>
                <p className="font-inter font-medium text-[14px] mt-1" style={{ color: DS.text.primary }}>
                  {sortedPhotos[activePhotoIndex].caption || sortedPhotos[activePhotoIndex].photo?.label || "Inspection Finding"}
                </p>
              </div>
              <button onClick={() => setActivePhotoIndex(null)}
                      className="w-11 h-11 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                <XCircle size={18} strokeWidth={1.5} style={{ color: DS.text.secondary }} />
              </button>
            </div>
            {/* Image */}
            <div className="flex-1 flex items-center justify-between px-8 relative">
              <button onClick={handlePrevPhoto}
                      className="absolute left-8 z-20 w-12 h-12 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                <ArrowLeft size={20} strokeWidth={1.5} style={{ color: DS.text.secondary }} />
              </button>
              <div className="w-full h-full max-h-[68vh] flex items-center justify-center p-6">
                <motion.div key={activePhotoIndex}
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            className="max-w-full max-h-full rounded-2xl overflow-hidden"
                            style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.60)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {sortedPhotos[activePhotoIndex].type === "structured" && sortedPhotos[activePhotoIndex].photo
                    ? <PhotoThumbnail photo={sortedPhotos[activePhotoIndex].photo!} className="max-w-full max-h-[68vh] object-contain" />
                    : sortedPhotos[activePhotoIndex].url
                      ? <img src={sortedPhotos[activePhotoIndex].url} alt="Gallery" className="max-w-full max-h-[68vh] object-contain" />
                      : null}
                </motion.div>
              </div>
              <button onClick={handleNextPhoto}
                      className="absolute right-8 z-20 w-12 h-12 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                <ChevronRight size={20} strokeWidth={1.5} style={{ color: DS.text.secondary }} />
              </button>
            </div>
            {/* Bottom meta panel */}
            {(() => {
              const meta = getPhotoMeta(sortedPhotos[activePhotoIndex], pathKey);
              return (
                <div className="px-8 py-5 flex gap-6 items-start justify-between" style={{ background: "rgba(8,12,24,0.95)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[8px] uppercase tracking-wider"
                           style={{ background: meta.badgeBg, border: `1px solid ${meta.badgeBorder}`, color: meta.badgeColor }}>
                        <meta.BadgeIcon size={9} strokeWidth={1.5} />
                        <span>{meta.badgeLabel}</span>
                      </div>
                      <span className="font-mono text-[10px]" style={{ color: DS.text.faint }}>{meta.location}</span>
                    </div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: DS.text.faint }}>Inspector Note</p>
                    <p className="font-inter text-[13px] leading-relaxed italic max-w-2xl" style={{ color: DS.text.secondary }}>"{meta.inspectorNote}"</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[9px] uppercase tracking-wider mb-1" style={{ color: DS.text.faint }}>Date Captured</p>
                    <p className="font-inter text-[12px]" style={{ color: DS.text.primary }}>
                      {new Date(sortedPhotos[activePhotoIndex].date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recheck Modal */}
      <AnimatePresence>
        {showRecheckModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[100] flex items-center justify-center px-8"
                      style={{ background: "rgba(2,4,14,0.85)", backdropFilter: "blur(12px)" }}>
            <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
                        className="max-w-md w-full p-8 space-y-6"
                        style={{ ...DS.card, borderRadius: "22px" }}>
              {recheckConfirmed ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(67,209,125,0.12)", border: "1px solid rgba(67,209,125,0.30)" }}>
                    <CheckCircle2 size={26} strokeWidth={1.5} style={{ color: "#43D17D" }} />
                  </div>
                  <h3 className="font-editorial font-medium text-xl" style={{ color: DS.text.primary }}>Reminder Scheduled</h3>
                  <p className="font-inter text-[13px]" style={{ color: DS.text.secondary }}>Hustad will reach out in {selectedMonths} months for your scheduled review.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-editorial font-medium text-xl" style={{ color: DS.text.primary, letterSpacing: "-0.01em" }}>Schedule Future Recheck</h3>
                      <p className="font-inter text-[12px] mt-1" style={{ color: DS.text.muted }}>Set a free reminder for a future inspection checkup.</p>
                    </div>
                    <button onClick={() => setShowRecheckModal(false)} className="transition-opacity hover:opacity-70">
                      <XCircle size={18} strokeWidth={1.5} style={{ color: DS.text.muted }} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[6, 12, 24].map(m => (
                      <button key={m} onClick={() => setSelectedMonths(m)}
                              className="py-4 rounded-xl font-inter text-[13px] font-medium transition-all"
                              style={selectedMonths === m
                                ? { background: "rgba(67,209,125,0.18)", border: "1px solid rgba(67,209,125,0.45)", color: "#43D17D" }
                                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: DS.text.secondary }}>
                        {m} Months
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowRecheckModal(false)}
                            className="flex-1 py-3 rounded-xl font-inter text-[13px]"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: DS.text.secondary }}>
                      Cancel
                    </button>
                    <button onClick={confirmRecheck} disabled={!selectedMonths}
                            className="flex-1 py-3 rounded-xl font-inter font-semibold text-[13px] transition-all"
                            style={selectedMonths
                              ? { background: "#43D17D", color: "#050816", boxShadow: "0 4px 20px rgba(67,209,125,0.30)" }
                              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: DS.text.faint, cursor: "not-allowed" }}>
                      Confirm
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════════════
          REP COMPANION SHEET
      ════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCompanion && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[120] flex items-end"
                      style={{ background: "rgba(2,4,14,0.75)", backdropFilter: "blur(12px)" }}
                      onClick={e => { if (e.target === e.currentTarget) setShowCompanion(false); }}>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 240 }}
              className="w-full max-w-2xl mx-auto flex flex-col max-h-[92vh] overflow-hidden"
              style={{
                background:         "linear-gradient(180deg, rgba(11,18,37,0.98) 0%, rgba(5,8,22,0.99) 100%)",
                border:             "1px solid rgba(255,255,255,0.09)",
                borderBottom:       "none",
                backdropFilter:     "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                borderRadius:       "28px 28px 0 0",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-7 py-5 shrink-0"
                   style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <BookOpen size={15} strokeWidth={1.5} style={{ color: "#4D6FFF" }} />
                    <span className="font-inter font-medium text-[15px]" style={{ color: DS.text.primary }}>Rep Companion</span>
                    <span className="px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-[0.18em]"
                          style={{ background: "rgba(77,111,255,0.12)", border: "1px solid rgba(77,111,255,0.28)", color: "#a0b8ff" }}>
                      Page 13
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-[0.14em]"
                          style={{ background: tk.badgeBg, border: `1px solid ${tk.badgeBorder}`, color: tk.badgeText }}>
                      {config.badgeLabel}
                    </span>
                  </div>
                  <p className="font-inter text-[11px]" style={{ color: DS.text.faint }}>Rep view only · Use on your phone while tablet faces homeowner</p>
                </div>
                <button onClick={() => setShowCompanion(false)}
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <XCircle size={16} strokeWidth={1.5} style={{ color: DS.text.muted }} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4">

                {/* Priorities */}
                {session.buyerData?.buyerPriorities && session.buyerData.buyerPriorities.length > 0 && (
                  <div className="p-5 rounded-[16px] space-y-3"
                       style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <MicroLabel>Your Stated Priorities</MicroLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {session.buyerData.buyerPriorities.map(p => (
                        <SemanticBadge
                          key={p}
                          icon={Sparkles}
                          label={p.replace(/_/g, " ")}
                          variant="neutral"
                          size="sm"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Classification */}
                <div className="p-5 rounded-[16px] space-y-1.5"
                     style={{ background: tk.accentSoft, border: `1px solid ${tk.accentBorder}` }}>
                  <MicroLabel>Final Classification</MicroLabel>
                  <p className="font-editorial font-medium text-[18px] mt-1.5" style={{ color: tk.accent, letterSpacing: "-0.01em" }}>{config.badgeLabel}</p>
                  <p className="font-inter text-[11px]" style={{ color: DS.text.muted }}>
                    {findings.urgentItemsCount > 0 && `${findings.urgentItemsCount} urgent · `}
                    {findings.stormRelatedItemsCount > 0 && `${findings.stormRelatedItemsCount} storm/repair · `}
                    {findings.monitorItemsCount > 0 && `${findings.monitorItemsCount} monitor`}
                  </p>
                </div>

                {/* Opening comment */}
                <div className="p-5 rounded-[16px] space-y-2.5"
                     style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <MicroLabel>Recommended Opening Comment</MicroLabel>
                  <p className="font-inter text-[13px] leading-relaxed italic" style={{ color: DS.text.secondary }}>
                    "{config.repOpeningComment}"
                  </p>
                </div>

                {/* Guided Questions + answer logging */}
                <div className="space-y-3">
                  <MicroLabel icon={MessageCircle}>Page 13: Guided Questions</MicroLabel>
                  {(["q1", "q2", "q3"] as const).map((key, i) => (
                    <div key={key} className="p-5 rounded-[16px] space-y-3"
                         style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5"
                              style={{ background: tk.iconBg, color: tk.accent }}>{i + 1}</span>
                        <p className="font-inter text-[13px] leading-relaxed" style={{ color: DS.text.secondary }}>{config.repGuidedQs[i]}</p>
                      </div>
                      <textarea
                        value={companionAnswers[key]}
                        onChange={e => setCompanionAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder="Log homeowner answer…"
                        rows={2}
                        className="w-full font-inter text-[12px] leading-relaxed resize-none focus:outline-none"
                        style={{
                          background:   "rgba(255,255,255,0.03)",
                          border:       "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "10px",
                          padding:      "10px 14px",
                          color:        DS.text.secondary,
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Guardrail */}
                <div className="p-5 rounded-[16px] space-y-2"
                     style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.18)" }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={13} strokeWidth={1.5} style={{ color: "#FBB924" }} />
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "#FBB924" }}>Guardrail</p>
                  </div>
                  <p className="font-inter text-[12px] leading-relaxed" style={{ color: DS.text.secondary }}>{config.repGuardrail}</p>
                </div>

                {/* Transition */}
                <div className="p-5 rounded-[16px] space-y-2"
                     style={{ background: "rgba(77,111,255,0.05)", border: "1px solid rgba(77,111,255,0.18)" }}>
                  <div className="flex items-center gap-2">
                    <ChevronRight size={13} strokeWidth={1.5} style={{ color: "#4D6FFF" }} />
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "#4D6FFF" }}>Transition to Page 14</p>
                  </div>
                  <p className="font-inter text-[12px] leading-relaxed" style={{ color: DS.text.secondary }}>{config.repTransition}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-7 py-5 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSaveCompanion}
                  className="flex-1 py-3.5 rounded-xl font-inter font-semibold text-[14px] transition-all"
                  style={companionSaved
                    ? { background: "rgba(67,209,125,0.14)", border: "1px solid rgba(67,209,125,0.35)", color: "#43D17D" }
                    : { background: "linear-gradient(90deg, #4D6FFF, #8B5CFF)", color: "white", boxShadow: "0 4px 20px rgba(77,111,255,0.30)" }}
                >
                  {companionSaved ? "Answers Saved ✓" : "Save Answers"}
                </motion.button>
                <button onClick={() => setShowCompanion(false)}
                        className="px-6 py-3.5 rounded-xl font-inter text-[14px] transition-opacity hover:opacity-70"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: DS.text.secondary }}>
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// B13 – Recommended Path
// ─────────────────────────────────────────────────────────────────────────────

export function B13RecommendedPath({ session, onUpdate, onNext, onBack }: Props) {
  const outcome = session.findings.outcomeType || "no_damage";
  const config = PATH_CONFIG[outcome] || PATH_CONFIG.no_damage;

  const recommendedPathId: SelectedPath = outcome === "claim_review_candidate"
    ? "claim_review"
    : outcome === "full_restoration_candidate"
      ? "full_restoration"
      : outcome === "repair_only"
        ? "direct_repair"
        : null;

  const showAlternatePath = outcome === "claim_review_candidate" || outcome === "full_restoration_candidate";
  const [selectedPath, setSelectedPath_] = useState<SelectedPath>(session.pathData.selectedPath || recommendedPathId);

  const handleContinue = () => { const updated = setSelectedPath(session, selectedPath); onUpdate(updated); onNext(); };

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606]">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(99,102,241,0.05),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.03),transparent_60%)]" />
      </div>
      <div className="absolute top-10 left-10 z-30 hidden lg:flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-[#E8EDF8] text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>
      <div className="relative z-10 flex-1 overflow-y-auto px-8 pt-20 pb-36 min-h-0">
        <div className="max-w-4xl mx-auto w-full space-y-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md w-fit mx-auto">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-[0.2em] pt-0.5">Recommended Strategy</span>
            </div>
            <h1 className="text-3xl md:text-6xl lg:text-7xl font-display font-medium text-[#E8EDF8] tracking-tight leading-[1.05]">{config.headline}</h1>
            <p className="text-xl text-[#AABDCF] font-light leading-relaxed max-w-2xl mx-auto">{config.explanation}</p>
          </motion.div>
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => setSelectedPath_(recommendedPathId)}
            className={cn("relative w-full p-10 rounded-[48px] overflow-hidden border text-left transition-all duration-500",
              selectedPath === recommendedPathId ? "bg-indigo-500/10 border-indigo-500/40 shadow-2xl" : "bg-white/[0.02] border-white/[0.1] hover:border-white/20")}
          >
            <div className="absolute inset-0 opacity-20 blur-3xl pointer-events-none" style={{ background: `radial-gradient(circle at center, ${config.cardColor}, transparent)` }} />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-10">
              <div className="md:col-span-4 flex flex-col items-start gap-5">
                <div className="w-16 h-16 rounded-[24px] flex items-center justify-center shadow-2xl" style={{ background: config.cardColor }}>
                  <config.icon className="w-8 h-8 text-[#E8EDF8]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-mono uppercase tracking-[0.3em] px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">Recommended</span>
                  </div>
                  <p className="text-2xl font-display font-medium text-[#E8EDF8]">{config.pathLabel}</p>
                  <p className="text-[#AABDCF] font-light text-sm uppercase tracking-widest mt-1">Hustad Certified Path</p>
                </div>
              </div>
              <div className="md:col-span-8 space-y-6 border-l border-white/5 pl-0 md:pl-10">
                <h3 className="text-[10px] font-mono text-indigo-300 uppercase tracking-[0.3em]">What happens next</h3>
                <div className="space-y-3">
                  {config.nextSteps.map((step, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.08 }} className="flex items-start gap-4">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500/40 shrink-0" />
                      <p className="text-[#DDE5F5] font-light text-base leading-relaxed">{step}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
            {selectedPath === recommendedPathId && (
              <motion.div layoutId="path-check" className="absolute top-8 right-8">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
              </motion.div>
            )}
          </motion.button>
          {showAlternatePath && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => setSelectedPath_("direct_repair")}
              className={cn("relative w-full p-8 rounded-[40px] border text-left transition-all duration-500",
                selectedPath === "direct_repair" ? "bg-white/10 border-white/30 shadow-xl" : "bg-white/[0.02] border-white/[0.05] hover:border-white/20")}
            >
              <div className="flex items-start gap-6">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors", selectedPath === "direct_repair" ? "bg-white text-black" : "bg-white/[0.05] text-[#8BA5C5]")}>
                  <Wrench className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-mono uppercase tracking-[0.3em] px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#8BA5C5]">Alternate Path</span>
                  </div>
                  <p className={cn("text-xl font-display font-medium transition-colors", selectedPath === "direct_repair" ? "text-[#E8EDF8]" : "text-[#DDE5F5]")}>Direct Repair</p>
                  <p className="text-sm text-[#8BA5C5] font-light leading-relaxed mt-1">Address documented items directly. No insurance claim required. Faster scheduling, out-of-pocket cost, full control over timing.</p>
                </div>
              </div>
              {selectedPath === "direct_repair" && (
                <motion.div layoutId="path-check" className="absolute top-6 right-6">
                  <ShieldCheck className="w-5 h-5 text-[#DDE5F5]" />
                </motion.div>
              )}
            </motion.button>
          )}
        </div>
      </div>
      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          <button onClick={onBack} className="group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 shrink-0">
            <ArrowLeft className="w-4 h-4 text-[#DDE5F5] group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-[#E8EDF8]">Previous</span>
          </button>
          <StarButton onClick={handleContinue} lightColor="#FAFAFA" backgroundColor="#060606" className="flex-1 h-14 md:h-20 rounded-full shadow-[0_20px_60px_rgba(99,102,241,0.2)] active:scale-95 transition-all group">
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">{config.ctaLabel}</span>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}

const PATH_CONFIG: Record<string, {
  headline: string; explanation: string; icon: any; cardColor: string;
  pathLabel: string; pathDetail: string; nextSteps: string[]; ctaLabel: string;
}> = {
  no_damage:             { headline: "Integrity Maintained.",       explanation: "Based on our forensic analysis, there is no actionable damage requiring a project or claim path today.",                                                                icon: ShieldCheck, cardColor: "#10b981", pathLabel: "Maintenance Only",    pathDetail: "Your property showed no meaningful storm damage during this inspection.",                                        nextSteps: ["Immutable documentation delivered for your records.", "Re-inspection recommended after significant storm events.", "Forensic data synced to Hustad CRM for history tracking."],                                   ctaLabel: "Review Your Deliverables" },
  monitor_only:          { headline: "Proactive Monitoring.",       explanation: "Conditions exist that warrant tracking, but no urgent repair or claim path is indicated today.",                                                                      icon: Eye,         cardColor: "#0ea5e9", pathLabel: "Strategic Monitor",   pathDetail: "Conditions documented for baseline tracking. No contract or authorization is required today.",                   nextSteps: ["Receive a monitor-only summary with re-inspection triggers.", "Schedule a follow-up forensic review in 12 months.", "Review high-resolution imagery for future comparison."],                                    ctaLabel: "Review Your Deliverables" },
  repair_only:           { headline: "Precision Restoration.",      explanation: "Targeted repairs are indicated to preserve system life. Full replacement is not required at this time.",                                                              icon: Wrench,      cardColor: "#6366f1", pathLabel: "Direct Repair",       pathDetail: "Repair-specific scope and authorization will be reviewed on the next screen.",                                    nextSteps: ["Finalize the surgical repair scope for authorization.", "Bypass insurance claims for faster scheduling.", "Review protection options for the repair zone."],                                                         ctaLabel: "Review Repair Authorization" },
  claim_review_candidate:{ headline: "Insurance Path Indicated.",   explanation: "Storm-related damage warrants a formal carrier review to determine policy-level restoration coverage.",                                                               icon: FileText,    cardColor: "#f59e0b", pathLabel: "Claim Review",        pathDetail: "Hustad will coordinate forensic documentation with your carrier for coverage determination.",                    nextSteps: ["Review the claim-path authorization on the next screen.", "Coordinate carrier inspection with Hustad field rep.", "Coverage decisions remain with your insurance carrier."],                                          ctaLabel: "Review Claim Path" },
  full_restoration_candidate: { headline: "Full Restoration Priority.", explanation: "Evidence supports a complete system restoration to return the property to its pre-loss or peak condition.",                                                      icon: Zap,         cardColor: "#f43f5e", pathLabel: "Full Restoration",    pathDetail: "System options and project authorization will be reviewed in the upcoming screens.",                              nextSteps: ["Select premium system and protection options.", "Review the executive project authorization.", "Confirm scheduling and logistics for production."],                                                               ctaLabel: "Review System Options" },
};

// ─────────────────────────────────────────────────────────────────────────────
// B14 – Path Decision (auto-forwards)
// ─────────────────────────────────────────────────────────────────────────────

export function B14PathDecision({ onNext }: Pick<Props, "onNext">) {
  useEffect(() => { onNext(); }, [onNext]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// B15 – Urgent Protection
// ─────────────────────────────────────────────────────────────────────────────

export function B15UrgentProtection({ session, onUpdate, onNext, onBack }: Props) {
  const [authorized, setAuthorized] = useState<boolean | null>(session.findings.urgentProtectionAuthorized);

  const handleContinue = () => {
    if (authorized === null) return;
    const updated: SessionState = { ...session, findings: { ...session.findings, urgentProtectionAuthorized: authorized } };
    const withAudit = addAuditEvent(updated, authorized ? "urgent_protection_authorized" : "urgent_protection_declined");
    onUpdate(withAudit); onNext();
  };

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(244,63,94,0.04),transparent_70%)]" />
      </div>
      <div className="absolute top-10 left-10 z-30 hidden lg:flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-[#E8EDF8] text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center pb-32">
        <div className="max-w-4xl w-full space-y-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 backdrop-blur-md w-fit mx-auto">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-[10px] font-mono text-rose-500 uppercase tracking-[0.2em] pt-0.5">Critical Protection Required</span>
            </div>
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[#E8EDF8] tracking-tight leading-[1.05]">
              <span className="text-rose-500">{session.findings.urgentItemsCount} urgent item{session.findings.urgentItemsCount !== 1 ? "s" : ""}</span> need<br />immediate attention.
            </h1>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative p-10 rounded-[48px] bg-rose-500/[0.03] border border-rose-500/[0.1] backdrop-blur-3xl text-left space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-rose-500" /></div>
                <p className="text-lg font-display font-medium text-[#E8EDF8]">Loss Containment Recommended</p>
              </div>
              <p className="text-[#AABDCF] font-light leading-relaxed">
                {session.findings.summaryBody ? session.findings.summaryBody.slice(0, 150) + "..." : "Urgent stabilization or narrow-scope immediate work is recommended."}
              </p>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#7090B0] mt-1" />
                <p className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-widest leading-relaxed">This is loss containment, not upsell. Scope is limited to documented urgent items.</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { val: true,  label: "Authorize Urgent Protection", detail: "Schedule stabilization or immediate repair for documented items.", icon: CheckCircle2 },
                { val: false, label: "Skip Protection for Now",     detail: "Continue with primary project path. Noted in your summary.",     icon: ExternalLink },
              ].map(opt => {
                const isSelected = authorized === opt.val;
                return (
                  <motion.button key={String(opt.val)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => setAuthorized(opt.val)}
                    className={cn("w-full text-left p-6 rounded-[32px] border transition-all duration-300 group overflow-hidden relative",
                      isSelected ? (opt.val ? "bg-rose-500/10 border-rose-500/40 shadow-2xl" : "bg-white/10 border-white/20 shadow-xl") : "bg-white/[0.02] border-white/[0.05] hover:border-white/20")}
                  >
                    <div className="relative z-10 flex items-start gap-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isSelected ? (opt.val ? "bg-rose-500 text-[#E8EDF8]" : "bg-white text-black") : "bg-white/5 text-[#7090B0]")}>
                        <opt.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className={cn("font-display font-medium text-lg", isSelected ? "text-[#E8EDF8]" : "text-[#DDE5F5] group-hover:text-[#E8EDF8]")}>{opt.label}</p>
                        <p className="text-xs text-[#7090B0] font-light mt-1 group-hover:text-[#AABDCF] transition-colors leading-relaxed">{opt.detail}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          <button onClick={onBack} className="group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 shrink-0">
            <ArrowLeft className="w-4 h-4 text-[#DDE5F5] group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-[#E8EDF8]">Back</span>
          </button>
          <StarButton onClick={handleContinue} disabled={authorized === null} lightColor="#FAFAFA" backgroundColor="#060606"
            className={cn("flex-1 max-w-md h-20 rounded-full transition-all group", authorized === null ? "opacity-20 grayscale" : "shadow-[0_20px_60px_rgba(244,63,94,0.2)] active:scale-95")}>
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">Continue</span>
              <ChevronRight className="w-5 h-5 text-rose-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}
