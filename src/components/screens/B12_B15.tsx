"use client";

import { useState, useEffect } from "react";
import type { SessionState, SelectedPath, InspectionPhoto, BuyerPriority } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StarButton } from "@/components/ui/star-button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Zap, Eye, Wrench, FileText, AlertTriangle, ChevronRight, ArrowLeft,
  Unlock, CheckCircle2, Camera, MapPin, Clock, ExternalLink, ShieldCheck,
  XCircle, Calendar, CloudLightning, ShieldAlert, ArrowRight,
  ChevronDown, ChevronUp, Layers, BookOpen, Hammer, Sparkles, FileCheck,
  MessageCircle, Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { setSelectedPath, addAuditEvent, unlockSummary } from "@/lib/session";
import { PhotoThumbnail } from "@/components/PhotoThumbnail";
import { useTheme } from "@/components/ThemeProvider";
import { evaluateScenarios, scanOpenQuestion } from "@/lib/promptEngine";

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
  whatMeansTitle?: string;
  whatMeans:      string;
  whatMeansBullets?: string[];
  nextStep?:       string;
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
    headline: "Direct repair is the\nrecommended path forward.",
    subhead: "The documented findings support a targeted repair scope. This path addresses what the evidence supports — nothing more. No insurance process required, faster scheduling, and full control over timing.",
    badgeLabel: "RECOMMENDED PATH",
    BadgeIcon: Wrench,
    theme: "red",
    whatMeansTitle: "Direct Repair",
    whatMeans: "Address documented items directly with a scoped repair authorization. No carrier process required. Hustad schedules repair work based on exactly what was documented during the inspection.",
    whatMeansBullets: [
      "Scope limited to documented findings — nothing beyond what the evidence supports.",
      "Faster scheduling with no carrier coordination delay.",
      "Full cost transparency before any work begins.",
      "You authorize exactly what gets repaired, and when."
    ],
    credibilityLines: [
      "We are not saying every condition requires full replacement.",
      "We are not asking you to approve more than the evidence supports.",
      "We are not recommending a carrier path if the findings don't support it.",
      "We are saying the documented condition has a clear, scoped repair path."
    ],
    proofSectionLabel: "Repair Scope Documentation",
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
  // Page background — deep navy, no violet
  pageBg: {
    background: [
      "radial-gradient(circle at top right,    rgba(30,77,140,0.16),  transparent 28%)",
      "radial-gradient(circle at bottom center,rgba(15,29,53,0.12),   transparent 40%)",
      "linear-gradient(180deg, #081120 0%, #050816 100%)",
    ].join(", "),
  } as React.CSSProperties,

  // Solid surface card — Glass Protocol: glass only on footer + modals
  card: {
    background: "#0d1525",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 2px 16px rgba(15,29,53,0.10), 0 1px 3px rgba(15,29,53,0.06)",
    borderRadius: "16px",
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
      btnGrad:        "#0f1d35",
      btnGlow:        "0 4px 20px rgba(15,29,53,0.45)",
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
      btnGrad:        "#2a8a82",
      btnGlow:        "0 4px 20px rgba(42,138,130,0.35)",
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
      btnGrad:        "#0f1d35",
      btnGlow:        "0 4px 20px rgba(15,29,53,0.45)",
      iconBg:         "rgba(67,209,125,0.14)",
      recheckActive:  "background: rgba(67,209,125,0.18); border-color: rgba(67,209,125,0.45);",
    },
  },
};


function getDynamicDS(theme: string) {
  const isDark = theme === "dark";
  if (isDark) {
    return {
      isDark: true,
      pageBg: DS.pageBg,
      card: DS.card,
      text: DS.text,
      theme: DS.theme,
      themedCard: (tk: any) => ({
        background: "#141f33",
        border: `1px solid ${tk.cardBorder}`,
        boxShadow: "0 2px 16px rgba(15,29,53,0.10), 0 1px 3px rgba(15,29,53,0.06)",
        borderRadius: "16px",
      } as React.CSSProperties),
    };
  }
  
  const lightTheme = {
    blue: {
      accent:         "#1D55C4",
      accentSoft:     "rgba(29,85,196,0.07)",
      accentBorder:   "rgba(29,85,196,0.22)",
      accentGlow:     "rgba(29,85,196,0.04)",
      badgeBg:        "rgba(29,85,196,0.07)",
      badgeBorder:    "rgba(29,85,196,0.22)",
      badgeText:      "#1D55C4",
      cardBorder:     "rgba(29,85,196,0.15)",
      cardGlow:       "rgba(29,85,196,0.04)",
      btnGrad:        "#1D55C4",
      btnGlow:        "0 4px 18px rgba(29,85,196,0.20)",
      iconBg:         "rgba(29,85,196,0.07)",
      recheckActive:  "background: rgba(29,85,196,0.12); border-color: rgba(29,85,196,0.32);",
    },
    red: {
      accent:         "#B91C1C",
      accentSoft:     "rgba(185,28,28,0.07)",
      accentBorder:   "rgba(185,28,28,0.22)",
      accentGlow:     "rgba(185,28,28,0.04)",
      badgeBg:        "rgba(185,28,28,0.07)",
      badgeBorder:    "rgba(185,28,28,0.22)",
      badgeText:      "#B91C1C",
      cardBorder:     "rgba(185,28,28,0.15)",
      cardGlow:       "rgba(185,28,28,0.04)",
      btnGrad:        "#2a8a82",
      btnGlow:        "0 4px 18px rgba(42,138,130,0.20)",
      iconBg:         "rgba(185,28,28,0.07)",
      recheckActive:  "background: rgba(185,28,28,0.12); border-color: rgba(185,28,28,0.32);",
    },
    green: {
      accent:         "#15803D",
      accentSoft:     "rgba(21,128,61,0.07)",
      accentBorder:   "rgba(21,128,61,0.22)",
      accentGlow:     "rgba(21,128,61,0.04)",
      badgeBg:        "rgba(21,128,61,0.07)",
      badgeBorder:    "rgba(21,128,61,0.22)",
      badgeText:      "#15803D",
      cardBorder:     "rgba(21,128,61,0.15)",
      cardGlow:       "rgba(21,128,61,0.04)",
      btnGrad:        "#1D55C4",
      btnGlow:        "0 4px 18px rgba(29,85,196,0.20)",
      iconBg:         "rgba(21,128,61,0.07)",
      recheckActive:  "background: rgba(21,128,61,0.12); border-color: rgba(21,128,61,0.32);",
    },
  };

  return {
    isDark: false,
    pageBg: {
      background: "#F7F5F1",
    } as React.CSSProperties,
    card: {
      background: "#FFFFFF",
      border: "1px solid rgba(27,43,75,0.10)",
      boxShadow: "0 1px 4px rgba(27,43,75,0.06), 0 2px 12px rgba(27,43,75,0.07)",
      borderRadius: "16px",
    } as React.CSSProperties,
    text: {
      primary:   "#1B2B4B",
      secondary: "rgba(27,43,75,0.72)",
      muted:     "rgba(27,43,75,0.48)",
      faint:     "rgba(27,43,75,0.28)",
    },
    theme: lightTheme,
    themedCard: (tk: any) => ({
      background: "#FFFFFF",
      border: `1px solid ${tk.cardBorder}`,
      boxShadow: "0 1px 4px rgba(27,43,75,0.06), 0 2px 12px rgba(27,43,75,0.07)",
      borderRadius: "16px",
    } as React.CSSProperties),
  };
}

function getBadgeTokens(theme: string) {
  const isDark = theme === "dark";
  if (isDark) {
    return BADGE;
  }
  return {
    neutral: {
      bg:     "rgba(29,85,196,0.07)",
      border: "rgba(29,85,196,0.22)",
      text:   "#1D55C4",
      glow:   "0 0 18px rgba(29,85,196,0.04)",
    },
    urgent: {
      bg:     "rgba(185,28,28,0.07)",
      border: "rgba(185,28,28,0.22)",
      text:   "#B91C1C",
      glow:   "0 0 18px rgba(185,28,28,0.04)",
    },
    maintenance: {
      bg:     "rgba(146,64,14,0.07)",
      border: "rgba(146,64,14,0.20)",
      text:   "#92400E",
      glow:   "0 0 18px rgba(146,64,14,0.04)",
    },
    success: {
      bg:     "rgba(22,101,52,0.07)",
      border: "rgba(22,101,52,0.20)",
      text:   "#166534",
      glow:   "0 0 18px rgba(22,101,52,0.04)",
    },
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
  const { theme } = useTheme();
  const badgeTokens = getBadgeTokens(theme);
  const [hovered, setHovered] = useState(false);
  const t = badgeTokens[variant];
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
  const { theme } = useTheme();
  const DS = getDynamicDS(theme);
  const themedCard = DS.themedCard;

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

  // ── Lightbox Accessibility ─────────────────────────────────────────────────
  useEffect(() => {
    if (activePhotoIndex === null) return;
    const previouslyFocusedElement = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActivePhotoIndex(null);
      }
      if (e.key === "Tab") {
        const focusableElements = document.querySelectorAll(
          '.lightbox-overlay button, .lightbox-overlay [href], .lightbox-overlay input, .lightbox-overlay select, .lightbox-overlay textarea, .lightbox-overlay [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Focus first focusable element on open
    setTimeout(() => {
      const focusable = document.querySelector('.lightbox-overlay button') as HTMLElement;
      focusable?.focus();
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [activePhotoIndex]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden" style={DS.pageBg}>

      {/* ════════════════════════════════════════════════════════════════════════
          CINEMATIC BACKGROUND — 7 layers deep
      ════════════════════════════════════════════════════════════════════════ */}
      {DS.isDark && (
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

          {/* L4 — Ambient glow · top-right · themed */}
          <div
            className="absolute -top-40 -right-40 w-[780px] h-[780px] rounded-full"
            style={{
              background: `radial-gradient(circle, ${tk.accentGlow.replace("0.10", "0.22")}, transparent 68%)`,
              filter: "blur(120px)",
              opacity: 0.18,
            }}
          />

          {/* L5 — Ambient glow · bottom-left · navy */}
          <div
            className="absolute -bottom-52 -left-52 w-[680px] h-[680px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(30,77,140,0.16), transparent 68%)",
              filter: "blur(120px)",
              opacity: 0.12,
            }}
          />

          {/* L6 — Soft blue bloom · top-left */}
          <div
            className="absolute top-16 -left-28 w-[440px] h-[440px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(30,77,140,0.14), transparent 65%)",
              filter: "blur(100px)",
              opacity: 0.08,
            }}
          />

          {/* L7 — Horizon bloom · center-bottom */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[360px] rounded-full"
            style={{
              background: "radial-gradient(ellipse, rgba(30,77,140,0.10), transparent 60%)",
              filter: "blur(110px)",
              opacity: 0.06,
            }}
          />

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          CINEMATIC HOUSE IMAGE — right-side hero, fades out before cards
          urgent_repair → roof_forensic (forensic shingle detail + analytics)
          carrier_review / no_action → home_aerial (luxury dusk aerial)
      ════════════════════════════════════════════════════════════════════════ */}
      {(() => {
        const fadeRgb = DS.isDark ? "5,8,22" : theme === "high-contrast" ? "255,255,255" : "247,245,241";
        return (
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
              className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
              style={{
                objectPosition: pathKey === "urgent_repair" ? "center 40%" : "center 30%",
                filter: DS.isDark 
                  ? "brightness(0.42) contrast(1.12) saturate(0.78) hue-rotate(-8deg)"
                  : "brightness(0.95) contrast(1.05) saturate(1.1)",
              }}
            />
    
            {/* Overlay A — left fade: full opacity to transparent, keeps left text readable */}
            <div className="absolute inset-0" style={{
              background: `linear-gradient(90deg, rgba(${fadeRgb},1) 0%, rgba(${fadeRgb},0.92) 30%, rgba(${fadeRgb},0.62) 58%, rgba(${fadeRgb},0.18) 100%)`,
            }} />
    
            {/* Overlay B — top vignette + heavy bottom fade into page */}
            <div className="absolute inset-0" style={{
              background: `linear-gradient(180deg, rgba(${fadeRgb},0.55) 0%, transparent 22%, transparent 55%, rgba(${fadeRgb},0.92) 82%, rgba(${fadeRgb},1) 100%)`,
            }} />
    
            {/* Overlay C — blue atmospheric glow: ties image into design system */}
            <div className="absolute inset-0" style={{
              background: DS.isDark ? "radial-gradient(circle at center right, rgba(61,90,254,0.18), transparent 40%)" : "radial-gradient(circle at center right, rgba(61,90,254,0.06), transparent 40%)",
            }} />
    
            {/* Overlay D — path-specific atmospheric tint */}
            <div className="absolute inset-0" style={{
              background: pathKey === "urgent_repair"
                ? DS.isDark ? "linear-gradient(180deg, rgba(255,60,80,0.06) 0%, transparent 50%)" : "linear-gradient(180deg, rgba(255,60,80,0.03) 0%, transparent 50%)"
                : DS.isDark ? "linear-gradient(180deg, rgba(10,18,48,0.28) 0%, transparent 45%)" : "linear-gradient(180deg, rgba(10,18,48,0.05) 0%, transparent 45%)",
            }} />
    
          </div>
        );
      })()}

      {/* ── Progress bar ─────────────────────────────────────────────────────── */}
      <div className="relative z-20 flex-shrink-0 pt-6">
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
              <p className="font-inter text-[12px] font-medium tracking-wide" style={{ color: DS.text.muted }}>Property &amp; Inspection Details</p>
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
              <p className="font-inter text-[12px] font-medium tracking-wide" style={{ color: DS.text.muted }}>Finding Summary</p>
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
                  <p className="font-inter text-[12px] font-medium tracking-wide" style={{ color: DS.text.muted }}>Your Stated Priorities</p>
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
                        background:   "#0a1020",
                        border:       "1px solid rgba(255,255,255,0.07)",
                        boxShadow:    "0 2px 16px rgba(15,29,53,0.10), 0 1px 3px rgba(15,29,53,0.06)",
                        borderRadius: "16px",
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
                  <div className="flex items-center gap-2">
                    <p className="font-inter text-[12px] font-medium tracking-wide uppercase" style={{ color: tk.accent, opacity: 0.85, letterSpacing: "1px" }}>{config.whatMeansTitle ? "RECOMMENDED PATH" : "Official Recommendation"}</p>
                    {config.whatMeansTitle && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border" style={{ background: tk.accentSoft, borderColor: tk.accentBorder }}>
                        <CheckCircle2 size={10} style={{ color: tk.accent }} />
                        <span className="font-inter text-[9px] font-medium" style={{ color: tk.accent }}>Selected</span>
                      </div>
                    )}
                  </div>
                  <p className="font-editorial font-medium text-4xl mt-2" style={{ color: DS.text.primary, lineHeight: 1.1, letterSpacing: "-0.01em" }}>{config.whatMeansTitle || config.badgeLabel}</p>
                </div>
                
                {config.whatMeansBullets ? (
                  <div className="space-y-6 pt-5">
                    <p className="font-inter text-[14px] leading-relaxed" style={{ color: DS.text.secondary }}>{config.whatMeans}</p>
                    <div style={{ height: "1px", background: tk.accentBorder, opacity: 0.5 }} />
                    <div className="space-y-4">
                      {config.whatMeansBullets.map((bullet, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: tk.accent }} />
                          <p className="font-inter text-[14px] leading-relaxed" style={{ color: DS.text.secondary }}>{bullet}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 pt-5" style={{ borderTop: `1px solid ${tk.accentBorder}` }}>
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: tk.iconBg }}>
                        <ShieldCheck size={15} strokeWidth={1.5} style={{ color: tk.accent }} />
                      </div>
                      <div className="space-y-1.5">
                        <p className="font-inter text-[12px] font-medium tracking-wide" style={{ color: DS.text.muted }}>What This Means</p>
                        <p className="font-inter text-[13px] leading-relaxed" style={{ color: DS.text.secondary }}>{config.whatMeans}</p>
                      </div>
                    </div>
                    {config.nextStep && (
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: tk.iconBg }}>
                          <ArrowRight size={15} strokeWidth={1.5} style={{ color: tk.accent }} />
                        </div>
                        <div className="space-y-1.5">
                          <p className="font-inter text-[12px] font-medium tracking-wide" style={{ color: DS.text.muted }}>Recommended Next Step</p>
                          <p className="font-inter text-[13px] leading-relaxed" style={{ color: DS.text.secondary }}>{config.nextStep}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Credibility Block */}
            <div className="lg:col-span-5" style={{ ...DS.card, padding: "32px" }}>
              <div className="space-y-5 h-full">
                <p className="font-inter text-[12px] font-medium tracking-wide" style={{ color: DS.text.muted }}>What We Are Not Saying</p>
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
           style={{ background: `linear-gradient(to top, ${DS.isDark ? "#050816" : "#F7F5F1"} 60%, transparent)` }}>
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex items-center gap-4">
            {/* Back — glass secondary */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onBack}
              className="flex items-center gap-2.5 px-7 font-inter font-medium text-[14px] shrink-0"
              style={{
                background:         DS.isDark ? "rgba(255,255,255,0.05)" : "rgba(27,43,75,0.04)",
                border:             DS.isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(27,43,75,0.10)",
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
            background:   "#1e4d8c",
            boxShadow:    "0 4px 20px rgba(30,77,140,0.40)",
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
                      role="dialog" aria-modal="true" aria-label="Photo detail view"
                      className="fixed inset-0 z-[110] flex flex-col select-none lightbox-overlay"
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
                      aria-label="Close photo"
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
                    : { background: "#2a8a82", color: "white", boxShadow: "0 4px 20px rgba(42,138,130,0.30)" }}
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
// B13 — Recommended Path (Page 14A / 14B / 14C)
// Cinematic luxury enterprise redesign
// ─────────────────────────────────────────────────────────────────────────────

type B13PathKey = "carrier_review" | "direct_repair" | "no_action";

function deriveB13PathKey(outcome: string | null, urgentCount: number): B13PathKey {
  if (urgentCount > 0 || outcome === "repair_only") return "direct_repair";
  if (outcome === "claim_review_candidate" || outcome === "full_restoration_candidate") return "carrier_review";
  return "no_action";
}

interface B13Config {
  variantLabel:           string;
  heroEyebrow:            string;
  heroHeadline:           string;
  heroSubhead:            string;
  theme:                  "blue" | "red" | "green";
  pathBadgeLabel:         string;
  PathBadgeIcon:          any;
  primaryPathId:          SelectedPath;
  primaryPathLabel:       string;
  primaryPathDescription: string;
  primaryBullets:         string[];
  alternatePath:          string;
  alternatePathDescription: string;
  showAlternatePath:      boolean;
  heroImage:              string;
  imagePosition:          string;
  credibilityLines:       string[];
  repOpeningLine:         string;
  repGuidedQs:            [string, string, string];
  repGuardrail:           string;
  ctaLabel:               string;
}

const B14_PATH_CONFIGS: Record<B13PathKey, B13Config> = {
  carrier_review: {
    variantLabel:   "14A",
    heroEyebrow:    "Recommended Path",
    heroHeadline:   "Carrier review is the\nrecommended path forward.",
    heroSubhead:    "The documented storm findings are strong enough to justify a formal carrier review before any out-of-pocket expense. This is not a coverage guarantee — it is a recommendation to ask the question the evidence supports.",
    theme:          "blue",
    pathBadgeLabel: "Carrier Review Candidate",
    PathBadgeIcon:  FileText,
    primaryPathId:          "claim_review",
    primaryPathLabel:       "Carrier Review",
    primaryPathDescription: "Coordinate a formal carrier inspection based on documented storm findings. Hustad prepares the documentation package. Your carrier reviews the evidence and makes a coverage determination.",
    primaryBullets: [
      "Hustad organizes and submits the documentation package to your carrier.",
      "Your carrier schedules an independent inspection of the property.",
      "Coverage determination remains entirely with your insurance carrier.",
      "No repair work begins until you authorize it after coverage review.",
    ],
    alternatePath:            "Direct Repair",
    alternatePathDescription: "Address documented items out-of-pocket without a carrier review. Faster scheduling, no insurance process, full cost at your expense.",
    showAlternatePath: true,
    heroImage:     "/images/home_aerial.png",
    imagePosition: "center 30%",
    credibilityLines: [
      "We are not saying your carrier has approved coverage.",
      "We are not saying every exterior condition is storm related.",
      "We are not asking you to make a repair decision without seeing the evidence.",
      "We are saying the documented findings are strong enough to justify the recommended next step.",
    ],
    repOpeningLine: "What I'd like to do is walk you through what the carrier review path actually looks like — step by step. Then we can decide together if it makes sense to move forward.",
    repGuidedQs: [
      "Based on what you've seen in the photos: does a carrier review feel like the right next step, or do you have questions before deciding?",
      "Is there anything about the carrier review process you'd like me to walk through before we move forward?",
      "If the carrier reviews the documentation and confirms coverage, would you want Hustad to manage the project?",
    ],
    repGuardrail: "Do not discuss coverage probability, approval odds, or claim dollar amounts. You are recommending a next step based on evidence. Stay on the documentation. Let the photos do the work.",
    ctaLabel: "Confirm the Carrier Review Path",
  },

  direct_repair: {
    variantLabel:   "14B",
    heroEyebrow:    "Recommended Path",
    heroHeadline:   "Direct repair is the\nrecommended path forward.",
    heroSubhead:    "The documented findings support a targeted repair scope. This path addresses what the evidence supports — nothing more. No insurance process required, faster scheduling, and full control over timing.",
    theme:          "red",
    pathBadgeLabel: "Direct Repair Recommended",
    PathBadgeIcon:  Wrench,
    primaryPathId:          "direct_repair",
    primaryPathLabel:       "Direct Repair",
    primaryPathDescription: "Address documented items directly with a scoped repair authorization. No carrier process required. Hustad schedules repair work based on exactly what was documented during the inspection.",
    primaryBullets: [
      "Scope limited to documented findings — nothing beyond what the evidence supports.",
      "Faster scheduling with no carrier coordination delay.",
      "Full cost transparency before any work begins.",
      "You authorize exactly what gets repaired, and when.",
    ],
    alternatePath:            "Carrier Review",
    alternatePathDescription: "If storm-related indicators exist, you may choose to explore a carrier review before committing to out-of-pocket repair. Longer timeline, potential coverage determination.",
    showAlternatePath: false,
    heroImage:     "/images/roof_forensic.png",
    imagePosition: "center 40%",
    credibilityLines: [
      "We are not saying every condition requires full replacement.",
      "We are not asking you to approve more than the evidence supports.",
      "We are not recommending a carrier path if the findings don't support it.",
      "We are saying the documented condition has a clear, scoped repair path.",
    ],
    repOpeningLine: "I want to walk you through exactly what the repair scope covers, so you can see what you're authorizing before we make any decisions.",
    repGuidedQs: [
      "Does the repair scope feel aligned with what you saw in the documentation?",
      "Is there anything about the repair process or timeline you'd like to clarify before we move forward?",
      "Would you like to review the authorization together on the next screen before making any decision?",
    ],
    repGuardrail: "Do not expand the scope beyond what the evidence supports. Do not introduce insurance options unless the homeowner specifically asks. Stay focused on the documented repair items.",
    ctaLabel: "Review the Repair Authorization",
  },

  no_action: {
    variantLabel:   "14C",
    heroEyebrow:    "Inspection Complete",
    heroHeadline:   "No action is recommended\nfor your property today.",
    heroSubhead:    "Hustad completed a thorough exterior inspection and did not document conditions that support repair, emergency action, or carrier review at this time. Your inspection record is organized and saved as a dated property baseline.",
    theme:          "green",
    pathBadgeLabel: "No Action Required Today",
    PathBadgeIcon:  CheckCircle2,
    primaryPathId:          null,
    primaryPathLabel:       "Save Baseline & Monitor",
    primaryPathDescription: "Your inspection record is documented, organized, and saved as a baseline. If conditions change after a future storm event, you have a dated comparison point. No repair or claim action is needed today.",
    primaryBullets: [
      "Inspection report delivered to your property record.",
      "Baseline documentation stored for future storm comparison.",
      "Monitor items flagged with re-inspection triggers.",
      "Schedule a free recheck reminder at any time.",
    ],
    alternatePath:            "Future Recheck Reminder",
    alternatePathDescription: "Set a free recheck reminder for 6 or 12 months. If a storm event occurs before then, your baseline documentation provides a before-and-after comparison.",
    showAlternatePath: true,
    heroImage:     "/images/home_aerial.png",
    imagePosition: "center 30%",
    credibilityLines: [
      "We are not saying your roof is perfect forever.",
      "We are not saying every condition needs action today.",
      "We are not asking you to make a repair or claim decision without a clear reason.",
      "We are saying the best next step today is documentation and monitoring.",
    ],
    repOpeningLine: "Let me show you what we're leaving you with today — even a no-action finding has real value when it's organized and saved to your property record.",
    repGuidedQs: [
      "Does it help to know this inspection is documented, even when there's no action to take today?",
      "Are there any areas of the property you'd like us to watch more closely going forward?",
      "Would you like to set a future recheck reminder? If there's a storm event, you'll have a before-and-after comparison.",
    ],
    repGuardrail: "Do not over-explain or look for problems that aren't there. This is a genuine no-action finding. Honor it. Your credibility is the deliverable today.",
    ctaLabel: "Save Your Property Record",
  },
};

const B13_PRIORITY_LABELS: Record<string, { label: string; icon: any; accent: string }> = {
  roof_longevity:     { label: "Roof Longevity",     icon: Shield,      accent: "#4D6FFF" },
  insurance_process:  { label: "Insurance Process",  icon: FileCheck,   accent: "#2563ba" },
  repair_speed:       { label: "Repair Speed",        icon: Zap,         accent: "#FF7849" },
  cost_clarity:       { label: "Cost Clarity",        icon: Eye,         accent: "#43D17D" },
  warranty_coverage:  { label: "Warranty Coverage",   icon: ShieldCheck, accent: "#FF4D8D" },
  minimal_disruption: { label: "Minimal Disruption",  icon: Home,        accent: "#FFC774" },
};

export function B13RecommendedPath({ session, onUpdate, onNext, onBack }: Props) {
  const { theme } = useTheme();
  const DS = getDynamicDS(theme);
  const themedCard = DS.themedCard;

  const outcome  = session.findings.outcomeType ?? "no_damage";
  const pathKey  = deriveB13PathKey(outcome, session.findings.urgentItemsCount);
  const config   = B14_PATH_CONFIGS[pathKey];
  const tk       = DS.theme[config.theme];

  const companionData = buildRepCompanion(session, pathKey);

  const legacyPK: PathKey = pathKey === "carrier_review" ? "carrier_review" : pathKey === "direct_repair" ? "urgent_repair" : "no_action";

  const initialPath = session.pathData.selectedPath ?? config.primaryPathId;

  const handleChipClick = (
    qObj: { text: string; ruleId: string },
    action: "understands" | "needs_proof" | "objection" | "moving_forward"
  ) => {
    const f = session.findings || {};
    const rulesFired = new Set(f.rules_fired || []);
    if (qObj.ruleId !== "fallback") rulesFired.add(qObj.ruleId);

    const promptsShown = new Set(f.prompts_shown || []);
    promptsShown.add(qObj.text);

    let categoryUnderstood = f.category_understood;
    let objectionCode = f.objection_code;
    let photoClarity = f.photo_clarity_score;

    if (action === "understands" || action === "moving_forward") categoryUnderstood = true;
    if (action === "needs_proof") photoClarity = 1; 
    if (action === "objection") objectionCode = "flagged_during_companion";

    onUpdate({
      ...session,
      findings: {
        ...session.findings,
        rules_fired: Array.from(rulesFired),
        prompts_shown: Array.from(promptsShown),
        question_helped_flag: true,
        category_understood: categoryUnderstood,
        objection_code: objectionCode,
        photo_clarity_score: photoClarity,
      } as any
    });
  };
  const [activeChips,     setActiveChips]      = useState<Record<string, string>>({});
  const [chosenPath,      setChosenPath_]      = useState<SelectedPath>(initialPath);
  const [showCompanion,   setShowCompanion]    = useState(false);
  const [companionAns,    setCompanionAns]     = useState({ q1: "", q2: "", q3: "" });
  const [companionSaved,  setCompanionSaved]   = useState(false);
  const [recheckShown,    setRecheckShown]     = useState(false);

  const allPhotos    = buildPhotoList(session);
  const sortedPhotos = sortPhotosForProof(allPhotos, legacyPK);
  const proofPhotos  = sortedPhotos.slice(0, 4);

  const address = [
    session.property?.address,
    session.property?.cityStateZip,
  ].filter(Boolean).join(", ");

  const inspectionDate = session.createdAt
    ? new Date(session.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  const stats = [
    { label: "Storm",   value: session.findings.stormRelatedItemsCount, color: "#4D6FFF", bg: "rgba(77,111,255,0.10)",  border: "rgba(77,111,255,0.20)"  },
    { label: "Urgent",  value: session.findings.urgentItemsCount,       color: "#FF5A6B", bg: "rgba(255,90,107,0.10)",  border: "rgba(255,90,107,0.20)"  },
    { label: "Monitor", value: session.findings.monitorItemsCount,      color: "#FFC774", bg: "rgba(255,184,77,0.10)",  border: "rgba(255,184,77,0.20)"  },
    { label: "Photos",  value: allPhotos.length,                        color: DS.text.secondary, bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.10)" },
  ];

  const handleContinue = () => {
    const updated = setSelectedPath(session, chosenPath);
    onUpdate(updated);
    onNext();
  };

  const handleSaveCompanion = () => {
    const combinedNotes = [companionAns.q1, companionAns.q2, companionAns.q3].filter(Boolean).join("\n\n");
    if (combinedNotes) {
      onUpdate({
        ...session,
        findings: {
          ...session.findings,
          aiFollowUpNote: `Rep Companion Notes:\n${combinedNotes}`
        } as any
      });
    }
    setCompanionSaved(true);
    setTimeout(() => setCompanionSaved(false), 2500);
  };

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden" style={DS.pageBg}>

      {/* ═══ CINEMATIC BACKGROUND — 7 layers ═══════════════════════════════════ */}
      {DS.isDark && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">

          {/* L1 — Film grain */}
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat", backgroundSize: "300px 300px",
            opacity: 0.030, mixBlendMode: "soft-light" as React.CSSProperties["mixBlendMode"],
          }} />

          {/* L2 — Blueprint technical grid */}
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cline x1='0' y1='0' x2='60' y2='0' stroke='%234D6FFF' stroke-width='0.35'/%3E%3Cline x1='0' y1='0' x2='0' y2='60' stroke='%234D6FFF' stroke-width='0.35'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat", backgroundSize: "60px 60px", opacity: 0.040,
          }} />

          {/* L3 — Edge vignette */}
          <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 220px rgba(0,0,0,0.38), inset 0 0 80px rgba(0,0,0,0.20)" }} />

          {/* L4 — Themed ambient glow top-right */}
          <div
            className="absolute -top-40 -right-40 w-[780px] h-[780px] rounded-full"
            style={{ background: `radial-gradient(circle, ${tk.accentGlow.replace("0.10", "0.22")}, transparent 68%)`, filter: "blur(120px)", opacity: 0.18 }}
          />

          {/* L5 — Ambient glow bottom-left · navy */}
          <div
            className="absolute -bottom-52 -left-52 w-[680px] h-[680px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(30,77,140,0.16), transparent 68%)", filter: "blur(120px)", opacity: 0.12 }}
          />

          {/* L6 — Blue bloom top-left */}
          <div
            className="absolute top-16 -left-28 w-[440px] h-[440px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(30,77,140,0.14), transparent 65%)", filter: "blur(100px)", opacity: 0.08 }}
          />

          {/* L7 — Horizon bloom */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[360px] rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(30,77,140,0.10), transparent 60%)", filter: "blur(110px)", opacity: 0.06 }}
          />
        </div>
      )}

      {/* ═══ CINEMATIC HOUSE / ROOF IMAGE ════════════════════════════════════════ */}
      {(() => {
        const fadeRgb = DS.isDark ? "5,8,22" : theme === "high-contrast" ? "255,255,255" : "247,245,241";
        return (
          <div className="absolute top-0 right-0 w-[60%] pointer-events-none overflow-hidden" style={{ zIndex: 2, height: "70vh" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={config.heroImage} alt="" aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
              style={{
                objectPosition: config.imagePosition,
                filter: DS.isDark 
                  ? "brightness(0.42) contrast(1.12) saturate(0.78) hue-rotate(-8deg)"
                  : "brightness(0.95) contrast(1.05) saturate(1.1)",
              }}
            />
            <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, rgba(${fadeRgb},1) 0%, rgba(${fadeRgb},0.92) 28%, rgba(${fadeRgb},0.62) 58%, rgba(${fadeRgb},0.12) 100%)` }} />
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(${fadeRgb},0.20) 0%, transparent 38%, rgba(${fadeRgb},0.88) 100%)` }} />
            <div className="absolute inset-0" style={{ background: DS.isDark ? "radial-gradient(circle at center right, rgba(61,90,254,0.18), transparent 40%)" : "radial-gradient(circle at center right, rgba(61,90,254,0.06), transparent 40%)" }} />
          </div>
        );
      })()}

      {/* ═══ FLOATING GLASS HEADER ════════════════════════════════════════════════ */}
      <div className="absolute top-0 inset-x-0 z-30 px-6 md:px-10 pt-5 pointer-events-none">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">

          {/* Brand wordmark */}
          <div className="flex items-baseline gap-2.5 pointer-events-auto">
            <img src="/logo.svg" alt="Hustad Logo" className="h-10 w-auto dark:invert opacity-90 transition-all duration-300" />
            <span style={{ fontFamily: "'Inter', system-ui", fontSize: "9px", letterSpacing: "3px", textTransform: "uppercase", color: DS.text.muted }}>Madison Residential</span>
          </div>

          {/* Center phase + progress pill */}
          <div className="hidden md:flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full pointer-events-auto"
              style={{ background: "#0d1525", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: tk.accent }} />
              <span style={{ fontFamily: "'Inter'", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: DS.text.muted }}>
                Review / Finalize · Phase B · Page {config.variantLabel}
              </span>
            </div>
            <div className="w-[200px] h-[2px] rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: "82%", background: `linear-gradient(90deg, ${tk.accent}, ${tk.accent}88)` }} />
            </div>
          </div>

          {/* Path badge */}
          <div className="pointer-events-auto">
            <SemanticBadge
              icon={config.PathBadgeIcon}
              label={config.pathBadgeLabel}
              variant={pathKey === "carrier_review" ? "neutral" : pathKey === "direct_repair" ? "urgent" : "success"}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* ═══ SCROLLABLE CONTENT ═══════════════════════════════════════════════════ */}
      <div className="relative z-10 flex-1 overflow-y-auto pb-36 min-h-0" style={{ scrollbarWidth: "none" as React.CSSProperties["scrollbarWidth"] }}>
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 pt-24 space-y-8">

          {/* ── § 1  HERO ──────────────────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.60, ease: [0.22, 1, 0.36, 1] }}
            className="pt-8 space-y-5"
          >
            <MicroLabel icon={Sparkles} accent={tk.accent}>{config.heroEyebrow}</MicroLabel>

            <h1 style={{
              fontFamily:    "'Cormorant Garamond', 'Cormorant', Georgia, serif",
              fontSize:      "clamp(48px, 5.8vw, 78px)",
              fontWeight:    400,
              lineHeight:    0.93,
              letterSpacing: "-0.03em",
              color:         DS.text.primary,
              whiteSpace:    "pre-line",
            }}>
              {config.heroHeadline}
            </h1>

            <p className="max-w-[580px]" style={{ fontFamily: "'Inter', system-ui", fontSize: "17px", lineHeight: 1.62, color: DS.text.secondary }}>
              {config.heroSubhead}
            </p>

            {/* Finding stats chips */}
            <div className="flex flex-wrap gap-2.5 pt-2">
              {stats.filter(s => s.value > 0).map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 + i * 0.06 }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}
                >
                  <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 500, color: s.color, lineHeight: 1 }}>{s.value}</span>
                  <span style={{ fontFamily: "'Inter'", fontSize: "10px", letterSpacing: "1.8px", textTransform: "uppercase", color: s.color, opacity: 0.80 }}>{s.label}</span>
                </motion.div>
              ))}
              {address && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <MapPin size={11} strokeWidth={1.5} style={{ color: DS.text.muted }} />
                  <span style={{ fontFamily: "'Inter'", fontSize: "11px", color: DS.text.muted }}>{address}</span>
                </motion.div>
              )}
              {inspectionDate && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.56 }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Clock size={10} strokeWidth={1.5} style={{ color: DS.text.muted }} />
                  <span style={{ fontFamily: "'Inter'", fontSize: "11px", color: DS.text.muted }}>Inspected {inspectionDate}</span>
                </motion.div>
              )}
            </div>
          </motion.section>

          {/* ── § 2  PATH CARDS — Primary (8-col) + Right Column (4-col) ────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" role="radiogroup" aria-label="Select inspection path">

            {/* Primary Recommendation Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => setChosenPath_(config.primaryPathId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setChosenPath_(config.primaryPathId);
                }
              }}
              role="radio"
              aria-checked={chosenPath === config.primaryPathId}
              tabIndex={0}
              className="lg:col-span-8 cursor-pointer relative overflow-hidden"
              whileHover={{ y: -2, transition: { duration: 0.18 } }}
              style={{
                ...themedCard(tk),
                padding: "36px",
                outline: chosenPath === config.primaryPathId ? `1.5px solid ${tk.accent}55` : "1.5px solid transparent",
                outlineOffset: "2px",
                transition: "outline 0.25s ease, box-shadow 0.25s ease",
              }}
            >
              {/* Subtle glow radial behind content */}
              <div className="absolute top-0 right-0 w-[320px] h-[320px] pointer-events-none opacity-[0.07]"
                style={{ background: `radial-gradient(circle, ${tk.accent}, transparent 70%)`, filter: "blur(60px)" }} />

              <div className="relative space-y-6">
                {/* Card header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span style={{ fontFamily: "'Inter'", fontSize: "9px", letterSpacing: "2.5px", textTransform: "uppercase", color: tk.accent }}>
                        Recommended Path
                      </span>
                      <AnimatePresence>
                        {chosenPath === config.primaryPathId && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                            style={{ background: tk.accentSoft, border: `1px solid ${tk.accentBorder}` }}
                          >
                            <CheckCircle2 size={9} style={{ color: tk.accent }} />
                            <span style={{ fontFamily: "'Inter'", fontSize: "9px", color: tk.accent, letterSpacing: "0.5px" }}>Selected</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <h2 style={{
                      fontFamily:    "'Cormorant Garamond', Georgia, serif",
                      fontSize:      "clamp(26px, 3vw, 38px)",
                      fontWeight:    500,
                      lineHeight:    1.0,
                      letterSpacing: "-0.02em",
                      color:         DS.text.primary,
                    }}>
                      {config.primaryPathLabel}
                    </h2>
                  </div>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: tk.iconBg }}>
                    <config.PathBadgeIcon size={20} strokeWidth={1.5} style={{ color: tk.accent }} />
                  </div>
                </div>

                <p style={{ fontFamily: "'Inter'", fontSize: "14px", lineHeight: 1.65, color: DS.text.secondary }}>
                  {config.primaryPathDescription}
                </p>

                <div style={{ height: "1px", background: tk.accentBorder }} />

                {/* Step bullets */}
                <div className="space-y-3">
                  {config.primaryBullets.map((bullet, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.28 + i * 0.07 }}
                      className="flex items-start gap-3"
                    >
                      <div className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tk.accent, opacity: 0.72 }} />
                      <p style={{ fontFamily: "'Inter'", fontSize: "13.5px", lineHeight: 1.62, color: DS.text.secondary }}>{bullet}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Path selector indicator */}
                <div className="pt-2 flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                    style={{ borderColor: chosenPath === config.primaryPathId ? tk.accent : "rgba(255,255,255,0.22)", background: chosenPath === config.primaryPathId ? tk.accentSoft : "transparent" }}>
                    {chosenPath === config.primaryPathId && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2 h-2 rounded-full" style={{ background: tk.accent }} />
                    )}
                  </div>
                  <span style={{ fontFamily: "'Inter'", fontSize: "12px", color: chosenPath === config.primaryPathId ? tk.accent : DS.text.muted, transition: "color 0.2s ease" }}>
                    {chosenPath === config.primaryPathId ? "This path is selected" : "Tap to select this path"}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Right column */}
            <div className="lg:col-span-4 space-y-4">

              {/* Alternate Path Card */}
              {config.showAlternatePath && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                  whileHover={{ y: -2, transition: { duration: 0.18 } }}
                  onClick={() => setChosenPath_(pathKey === "carrier_review" ? "direct_repair" : null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setChosenPath_(pathKey === "carrier_review" ? "direct_repair" : null);
                    }
                  }}
                  role="radio"
                  aria-checked={chosenPath === (pathKey === "carrier_review" ? "direct_repair" : null)}
                  tabIndex={0}
                  className="cursor-pointer relative overflow-hidden"
                  style={{
                    ...DS.card,
                    padding: "24px",
                    outline: chosenPath !== config.primaryPathId && config.showAlternatePath ? "1.5px solid rgba(255,255,255,0.18)" : "1.5px solid transparent",
                    outlineOffset: "2px",
                    transition: "outline 0.25s ease",
                  }}
                >
                  <div className="space-y-3">
                    <span style={{ fontFamily: "'Inter'", fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase", color: DS.text.muted }}>Alternate Path</span>
                    <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 500, lineHeight: 1.1, color: DS.text.primary }}>
                      {config.alternatePath}
                    </p>
                    <p style={{ fontFamily: "'Inter'", fontSize: "12.5px", lineHeight: 1.60, color: DS.text.muted }}>
                      {config.alternatePathDescription}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <div className="w-4 h-4 rounded-full border flex items-center justify-center transition-all"
                        style={{ borderColor: chosenPath !== config.primaryPathId && config.showAlternatePath ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.20)" }}>
                        {chosenPath !== config.primaryPathId && config.showAlternatePath && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <span style={{ fontFamily: "'Inter'", fontSize: "11px", color: DS.text.muted }}>Choose alternate path</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Homeowner Priorities */}
              {(session.buyerData?.buyerPriorities?.length ?? 0) > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                  style={{ ...DS.card, padding: "20px" }}
                >
                  <div className="space-y-3">
                    <p className="font-inter text-[12px] font-medium tracking-wide" style={{ color: DS.text.muted }}>Your Priorities</p>
                    <div className="flex flex-wrap gap-2">
                      {(session.buyerData?.buyerPriorities || []).map((p: BuyerPriority) => {
                        const meta = B13_PRIORITY_LABELS[p];
                        if (!meta) return null;
                        const PIcon = meta.icon;
                        return (
                          <div key={p} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
                            <PIcon size={10} strokeWidth={1.5} style={{ color: meta.accent }} />
                            <span style={{ fontFamily: "'Inter'", fontSize: "11px", color: DS.text.secondary }}>{meta.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Trust / Credibility Card */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32 }}
                style={{ ...DS.card, padding: "22px" }}
              >
                <div className="space-y-3.5">
                  <p className="font-inter text-[12px] font-medium tracking-wide" style={{ color: DS.text.muted }}>What We Are Not Saying</p>
                  <div className="space-y-2.5">
                    {config.credibilityLines.map((line, i) => {
                      const isPositive = line.startsWith("We are saying");
                      return (
                        <div key={i} className="flex items-start gap-2.5">
                          {isPositive
                            ? <CheckCircle2 size={12} strokeWidth={1.5} className="shrink-0 mt-0.5" style={{ color: tk.accent }} />
                            : <XCircle     size={12} strokeWidth={1.5} className="shrink-0 mt-0.5" style={{ color: "#FF5A6B", opacity: 0.55 }} />
                          }
                          <p style={{ fontFamily: "'Inter'", fontSize: "11.5px", lineHeight: 1.55, color: isPositive ? DS.text.primary : DS.text.muted }}>
                            {line}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* ── § 3  PROOF PHOTOS DOCUMENTATION GALLERY ─────────────────────────── */}
          {proofPhotos.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38 }}
              className="space-y-4"
            >
              <MicroLabel icon={Camera} accent={tk.accent}>
                {pathKey === "carrier_review" ? "Storm Evidence Documentation" : pathKey === "direct_repair" ? "Repair Scope Documentation" : "Inspection Documentation"}
              </MicroLabel>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {proofPhotos.map((photo) => {
                  const meta = getPhotoMeta(photo, legacyPK);
                  const BadgeIcon = meta.BadgeIcon;
                  return (
                    <motion.div
                      key={photo.id}
                      whileHover={{ y: -3, transition: { duration: 0.18 } }}
                      className="overflow-hidden"
                      style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(10,16,32,0.92)" }}
                    >
                      <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
                        {photo.type === "structured" && photo.photo ? (
                          <PhotoThumbnail photo={photo.photo} className="w-full h-full object-cover" />
                        ) : photo.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.02)" }}>
                            <Camera size={20} strokeWidth={1} style={{ color: DS.text.faint }} />
                          </div>
                        )}
                        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.82) 100%)" }} />
                        <div className="absolute top-2 left-2">
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                            style={{ background: meta.badgeBg, border: `1px solid ${meta.badgeBorder}`, color: meta.badgeColor, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", fontSize: "8px", fontFamily: "'Inter'", fontWeight: 500, letterSpacing: "0.5px" }}>
                            <BadgeIcon size={8} strokeWidth={1.5} />
                            <span>{meta.badgeLabel}</span>
                          </div>
                        </div>
                        <div className="absolute bottom-2 left-2 right-2">
                          <p style={{ fontFamily: "'Inter'", fontSize: "10px", color: "rgba(255,255,255,0.82)", lineHeight: 1.3 }}>{meta.location}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* ── § 4  REP-GUIDED QUESTIONS ─────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44 }}
            className="space-y-4 pt-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <MicroLabel icon={MessageCircle} accent={tk.accent}>Rep-Guided Questions</MicroLabel>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {companionData.questions.map((qObj, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -2, transition: { duration: 0.18 } }}
                  style={DS.card}
                  className="p-5 space-y-3"
                >
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold"
                    style={{ background: tk.iconBg, color: tk.accent }}>{i + 1}</div>
                  <p style={{ fontFamily: "'Inter'", fontSize: "13px", lineHeight: 1.62, color: DS.text.secondary }}>{qObj.text}</p>
                </motion.div>
              ))}
            </div>

            {/* Rep guardrail (rep mode only) */}
            {session.mode === "rep" && (
              <div className="flex items-start gap-3 px-5 py-4 rounded-[14px]"
                style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.14)" }}>
                <ShieldAlert size={13} strokeWidth={1.5} className="shrink-0 mt-0.5" style={{ color: "#FBB924", opacity: 0.70 }} />
                <p style={{ fontFamily: "'Inter'", fontSize: "12px", lineHeight: 1.55, color: "rgba(251,191,36,0.60)" }}>{config.repGuardrail}</p>
              </div>
            )}
          </motion.section>

          {/* ── § 5  No-action recheck nudge ─────────────────────────────────── */}
          {pathKey === "no_action" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.50 }}
              className="flex items-center justify-between gap-6 p-5 rounded-[16px]"
              style={{ background: "rgba(67,209,125,0.06)", border: "1px solid rgba(67,209,125,0.18)" }}
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(67,209,125,0.12)" }}>
                  <Calendar size={16} strokeWidth={1.5} style={{ color: "#43D17D" }} />
                </div>
                <div>
                  <p style={{ fontFamily: "'Inter'", fontWeight: 500, fontSize: "13px", color: DS.text.primary }}>Schedule a Future Recheck</p>
                  <p style={{ fontFamily: "'Inter'", fontSize: "11px", marginTop: "3px", color: DS.text.muted }}>
                    Set a free reminder. If there's a storm event, you'll have a before-and-after comparison.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRecheckShown(true)}
                className="px-4 py-2 rounded-xl shrink-0 transition-opacity hover:opacity-80 active:scale-95"
                style={{ background: "rgba(67,209,125,0.12)", border: "1px solid rgba(67,209,125,0.30)", fontFamily: "'Inter'", fontSize: "11px", letterSpacing: "0.5px", color: "#43D17D" }}
              >
                {recheckShown ? "Reminder Set" : "Set Reminder"}
              </button>
            </motion.div>
          )}

        </div>
      </div>

      {/* ═══ BOTTOM CTA BAR ═══════════════════════════════════════════════════════ */}
      <div className="absolute bottom-0 inset-x-0 z-30 px-6 md:px-10 pb-8 pt-20"
        style={{ background: `linear-gradient(to top, ${DS.isDark ? "#050816" : "#F7F5F1"} 60%, transparent)` }}>
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex items-center gap-4">

            {/* Back — glass secondary */}
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={onBack}
              className="flex items-center gap-2.5 px-7 font-inter font-medium text-[14px] shrink-0"
              style={{ background: DS.isDark ? "rgba(255,255,255,0.05)" : "rgba(27,43,75,0.04)", border: DS.isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(27,43,75,0.10)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", height: "56px", borderRadius: "14px", color: DS.text.secondary }}
            >
              <ArrowLeft size={16} strokeWidth={1.5} />
              <span>Previous</span>
            </motion.button>

            {/* Primary CTA — luxury gradient */}
            <motion.button
              whileHover={{ scale: 1.015, filter: "brightness(1.08)" }}
              whileTap={{ scale: 0.975 }}
              onClick={handleContinue}
              className="flex-1 flex items-center justify-center gap-3 font-inter font-semibold text-[15px] text-white"
              style={{ background: tk.btnGrad, boxShadow: tk.btnGlow, height: "56px", borderRadius: "14px" }}
            >
              <span>{config.ctaLabel}</span>
              <ChevronRight size={18} strokeWidth={2} />
            </motion.button>
          </div>

          {/* Footer reassurance */}
          <div className="flex items-center justify-center gap-2"
            style={{ fontFamily: "'Inter'", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: DS.text.faint }}>
            <CheckCircle2 size={11} strokeWidth={1.5} style={{ color: tk.accent }} />
            <span>You can review everything before making any decision. No commitment until you authorize.</span>
          </div>
        </div>
      </div>

      {/* ═══ REP COMPANION FAB ════════════════════════════════════════════════════ */}
      {session.mode === "rep" && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.7, type: "spring", stiffness: 260, damping: 22 }}
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
          onClick={() => setShowCompanion(true)}
          className="absolute bottom-32 right-6 z-40 flex items-center justify-center"
          style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#1e4d8c", boxShadow: "0 4px 20px rgba(30,77,140,0.40)" }}
        >
          <BookOpen size={20} strokeWidth={1.5} color="white" />
        </motion.button>
      )}

      {/* ═══ REP COMPANION DRAWER ═════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCompanion && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-end p-6"
            style={{ background: "rgba(2,4,14,0.72)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowCompanion(false); }}
          >
            <motion.div
              initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="w-full max-w-sm p-8 space-y-6"
              style={{ ...DS.card, borderRadius: "24px", maxHeight: "72vh", overflowY: "auto" }}
            >
              <div className="flex items-center justify-between">
                <MicroLabel icon={BookOpen} accent={tk.accent}>Rep Companion · Page {config.variantLabel}</MicroLabel>
                <button onClick={() => setShowCompanion(false)} style={{ color: DS.text.muted }}>
                  <XCircle size={18} strokeWidth={1.5} />
                </button>
              </div>

              {/* Opening approach */}
              <div className="space-y-2 p-4 rounded-[14px]" style={{ background: tk.accentSoft, border: `1px solid ${tk.accentBorder}` }}>
                <MicroLabel accent={tk.accent}>Opening Approach</MicroLabel>
                <p style={{ fontFamily: "'Inter'", fontSize: "12.5px", lineHeight: 1.6, color: DS.text.secondary, fontStyle: "italic" }}>
                  "{companionData.openingLine}"
                </p>
              </div>

              {/* Questions with note fields */}
              <div className="space-y-4">
                {companionData.questions.map((qObj, i) => {
                  const key = `q${i + 1}` as "q1" | "q2" | "q3";
                  const q = qObj.text;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-mono font-bold"
                          style={{ background: tk.iconBg, color: tk.accent }}>{i + 1}</div>
                        <span style={{ fontFamily: "'Inter'", fontSize: "9px", letterSpacing: "1.5px", textTransform: "uppercase", color: DS.text.muted }}>Question {i + 1}</span>
                      </div>
                      <p style={{ fontFamily: "'Inter'", fontSize: "12px", lineHeight: 1.55, color: DS.text.secondary }}>{q}</p>
                      
                      {/* Chips for CRM logging */}
                      <div className="flex flex-wrap gap-2 pt-1 pb-2">
                        {[
                          { label: "Understands", act: "understands" },
                          { label: "Needs more proof", act: "needs_proof" },
                          { label: "Objection", act: "objection" },
                          { label: "Moving forward", act: "moving_forward" }
                        ].map((chip) => {
                          const isActive = activeChips[key] === chip.act;
                          return (
                            <button
                              key={chip.act}
                              onClick={() => {
                                setActiveChips(prev => ({ ...prev, [key]: chip.act }));
                                handleChipClick(qObj, chip.act as any);
                              }}
                              className="px-2 py-1 rounded-md transition-colors"
                              style={{ 
                                background: isActive ? "rgba(29,85,196,0.12)" : "rgba(255,255,255,0.05)", 
                                border: isActive ? "1.5px solid #1D55C4" : "1px solid rgba(255,255,255,0.1)",
                                fontFamily: "'Inter'", 
                                fontSize: "10px", 
                                color: isActive ? "#E8EDF8" : DS.text.secondary 
                              }}
                            >
                              {chip.label}
                            </button>
                          );
                        })}
                      </div>

                      <textarea
                        value={companionAns[key]}
                        onChange={(e) => setCompanionAns(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder="Note homeowner response..."
                        rows={2}
                        className="w-full resize-none"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "8px 10px", fontFamily: "'Inter'", fontSize: "11px", color: DS.text.secondary, outline: "none" }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Guardrail */}
              <div className="flex items-start gap-2.5 p-3 rounded-[12px]"
                style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.14)" }}>
                <ShieldAlert size={13} strokeWidth={1.5} className="shrink-0 mt-0.5" style={{ color: "#FBB924" }} />
                <p style={{ fontFamily: "'Inter'", fontSize: "11px", lineHeight: 1.50, color: "rgba(251,191,36,0.62)" }}>{companionData.guardrail}</p>
              </div>

              {/* Save button */}
              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                onClick={handleSaveCompanion}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] text-[13px] font-medium"
                style={{
                  fontFamily: "'Inter'",
                  background: companionSaved ? "rgba(67,209,125,0.18)" : "#2a8a82",
                  border:     `1px solid ${companionSaved ? "rgba(67,209,125,0.35)" : "#2a8a82"}`,
                  color:      companionSaved ? "#79E5A2" : "white",
                  transition: "background 0.25s ease, border-color 0.25s ease, color 0.25s ease",
                }}
              >
                {companionSaved
                  ? <><CheckCircle2 size={14} strokeWidth={1.5} /> Notes Saved</>
                  : <><Sparkles size={14} strokeWidth={1.5} /> Save Notes</>
                }
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// B14 – Path Decision (auto-forwards)
// ─────────────────────────────────────────────────────────────────────────────

function buildRepCompanion(session: any, pathKey: string) {
  const bd = session.buyerData || {};
  const priorities = bd.buyerPriorities || [];
  const comfort = bd.decisionComfort || "a clear process";
  const insurerStatus = bd.insurerContactStatus || "not_yet";
  const hasOtherDecisionMaker = bd.anotherDecisionMakerPresent === true;

  const pLabels: Record<string, string> = {
    roof_longevity: "roof longevity",
    insurance_process: "the insurance process",
    repair_speed: "repair speed",
    cost_clarity: "cost clarity",
    warranty_coverage: "warranty coverage",
    minimal_disruption: "minimal disruption",
  };

  const topPriorities = priorities.slice(0, 2).map((p: string) => pLabels[p] || p);
  const priorityStr = topPriorities.length > 1 
    ? `${topPriorities[0]} and ${topPriorities[1]}`
    : (topPriorities[0] || "your property's condition");

  const comfortLabels: Record<string, string> = {
    clear_photos: "clear photos",
    urgent_vs_monitor: "understanding what is urgent vs monitor",
    insurance_boundaries: "knowing insurance boundaries",
    cost_options: "seeing cost options",
    warranty_coverage: "understanding warranty coverage",
    spouse_involvement: "including your spouse",
    timeline: "knowing the timeline",
  };
  const comfortStr = comfortLabels[comfort] || comfort;

  const openingLine = `Before we get into the photos, I saw that your main priorities are ${priorityStr}. You also said ${comfortStr} would help you feel comfortable. I'll start there.`;

  // Evaluate Scenario Engine (S01-S30)
  const scenarios = evaluateScenarios(session);
  let selectedQs: { text: string, ruleId: string }[] = scenarios.map((s: any) => ({ text: s.question, ruleId: s.id }));

  // §29.7 priority-question fallback mapping (with pathKey consideration where useful)
  if (selectedQs.length < 3) {
    const mainP = priorities[0];
    let fallbacks: string[] = [];
    if (mainP === "roof_longevity") {
      fallbacks = [
        "How long do you expect to stay in this home?",
        "Are you trying to get a few more years or thinking long-term?",
        "Does this look like a targeted repair or something bigger from the photos?"
      ];
    } else if (mainP === "insurance_process") {
      fallbacks = [
        "Have you already contacted the carrier, or were you waiting for findings?",
        "Would you like a photo summary if you speak with them?",
        "Is your main question whether this is worth documenting for carrier review?"
      ];
    } else if (mainP === "repair_speed") {
      fallbacks = [
        "Any active leaks or interior staining?",
        "If immediate protection is needed, are you comfortable authorizing it while the rest is sorted out?",
        "Is speed more important than comparing all options?"
      ];
    } else if (mainP === "cost_clarity") {
      fallbacks = [
        "Would you prefer one recommendation or two options with tradeoffs?",
        "Is your concern total cost, surprise cost, deductible, or knowing what happens first?",
        "Would a written scope help?"
      ];
    } else if (mainP === "warranty_coverage") {
      fallbacks = [
        "Are you looking for the longest possible warranty, or just enough to cover your current plans?",
        "Is having a single manufacturer responsible for all components important to you?"
      ];
    } else if (mainP === "minimal_disruption") {
      fallbacks = [
        "Are you mostly concerned about noise, timeline, or mess?",
        "Do you have pets or children we should plan around?"
      ];
    }
    
    for (const fb of fallbacks) {
      if (selectedQs.length >= 3) break;
      if (!selectedQs.find(q => q.text === fb)) selectedQs.push({ text: fb, ruleId: "fallback" });
    }
  }

  if (selectedQs.length < 3) {
    if (pathKey === "carrier_review" && !selectedQs.find(q => q.text === "Based on the photos, does a carrier review feel like the right next step?")) {
      selectedQs.push({ text: "Based on the photos, does a carrier review feel like the right next step?", ruleId: "fallback" });
    } else if (pathKey === "direct_repair" && !selectedQs.find(q => q.text === "Does the repair scope feel aligned with what you saw in the documentation?")) {
      selectedQs.push({ text: "Does the repair scope feel aligned with what you saw in the documentation?", ruleId: "fallback" });
    } else if (!selectedQs.find(q => q.text === "Is there anything else you want to review before making a decision?")) {
      selectedQs.push({ text: "Is there anything else you want to review before making a decision?", ruleId: "fallback" });
    }
  }

  const qs = selectedQs.slice(0, 3);

  let guardrail = "Do not expand the scope beyond what the evidence supports. Let the photos do the work.";
  
  const tags = scanOpenQuestion(bd.buyerQuestions || "");
  if (tags.includes("deductible")) {
    guardrail = "[DEDUCTIBLE] Show deductible guardrail. Do not imply waiver. " + guardrail;
  } else if (tags.includes("trust_barrier")) {
    guardrail = "[TRUST] Use trust-first script. Show known vs unknown clearly. " + guardrail;
  } else if (tags.includes("leak_urgent")) {
    guardrail = "[URGENT] Focus on immediate protection before broad scope. " + guardrail;
  } else if (tags.includes("comparison")) {
    guardrail = "[COMPARE] Offer apples-to-apples comparison without attacking competitors. " + guardrail;
  } else if (insurerStatus === "already_contacted" && pathKey === "carrier_review") {
    guardrail = "The homeowner has already contacted insurance. Do not make coverage promises. Focus on how our documentation supports their existing claim.";
  } else if (insurerStatus === "not_yet" && pathKey === "carrier_review") {
    guardrail = "Do not discuss coverage probability or claim amounts. Focus entirely on recommending a formal review based on the evidence shown.";
  } else if (pathKey === "direct_repair") {
    guardrail = "Do not introduce insurance options unless the homeowner specifically asks. Stay focused on the documented repair items.";
  }

  let closeSentence = "Confirm the path and proceed to the authorization.";
  if (hasOtherDecisionMaker) {
    closeSentence = `Since another decision maker is involved, offer to send a digital copy of the Dossier and schedule a quick follow-up review for ${pathKey === 'carrier_review' ? 'insurance next steps' : 'repair options'}.`;
  } else if (pathKey === "carrier_review") {
    closeSentence = "If they agree the evidence warrants a review, move to the Contingency Agreement.";
  } else if (pathKey === "direct_repair") {
    closeSentence = "If they agree with the scope, move directly to the Repair Authorization.";
  }

  return {
    openingLine,
    questions: qs,
    guardrail,
    closeSentence
  };
}

export function B14PathDecision({ onNext }: Pick<Props, "onNext">) {
  useEffect(() => { onNext(); }, [onNext]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// B15 – Urgent Protection
// ─────────────────────────────────────────────────────────────────────────────

export function B15UrgentProtection({ session, onUpdate, onNext, onBack }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [authorized, setAuthorized] = useState<boolean | null>(session.findings.urgentProtectionAuthorized);

  const handleContinue = () => {
    if (authorized === null) return;
    const updated: SessionState = { ...session, findings: { ...session.findings, urgentProtectionAuthorized: authorized } };
    const withAudit = addAuditEvent(updated, authorized ? "urgent_protection_authorized" : "urgent_protection_declined");
    onUpdate(withAudit); onNext();
  };

  return (
    <div className={cn("relative flex flex-col h-screen w-full overflow-hidden transition-colors duration-300", isDark ? "bg-[#060606]" : "bg-[#F7F5F1]")}>
      {isDark && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(244,63,94,0.04),transparent_70%)]" />
        </div>
      )}
      
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center pb-32">
        <div className="max-w-4xl w-full space-y-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 backdrop-blur-md w-fit mx-auto">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-[10px] font-mono text-rose-500 uppercase tracking-[0.2em] pt-0.5">Critical Protection Required</span>
            </div>
            <h1 className={cn("text-3xl md:text-6xl lg:text-8xl font-display font-medium tracking-tight leading-[1.05]", isDark ? "text-[#E8EDF8]" : "text-[#1B2B4B]")}>
              <span className="text-rose-500">{session.findings.urgentItemsCount} urgent item{session.findings.urgentItemsCount !== 1 ? "s" : ""}</span> need<br />immediate attention.
            </h1>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className={cn("relative p-10 rounded-2xl border text-left space-y-6", isDark ? "bg-[#0d1525] border-rose-500/[0.1]" : "bg-rose-50/50 border-rose-200")}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-rose-500" /></div>
                <p className={cn("text-lg font-display font-medium", isDark ? "text-[#E8EDF8]" : "text-[#1B2B4B]")}>Loss Containment Recommended</p>
              </div>
              <p className={cn("font-light leading-relaxed", isDark ? "text-[#AABDCF]" : "text-[rgba(27,43,75,0.72)]")}>
                {session.findings.summaryBody ? session.findings.summaryBody.slice(0, 150) + "..." : "Urgent stabilization or narrow-scope immediate work is recommended."}
              </p>
              <div className={cn("p-4 rounded-2xl border flex items-start gap-3", isDark ? "bg-black/40 border-white/5" : "bg-white border-zinc-200")}>
                <ShieldCheck className={cn("w-4 h-4 mt-1", isDark ? "text-[#7090B0]" : "text-zinc-500")} />
                <p className={cn("text-[10px] font-mono uppercase tracking-widest leading-relaxed", isDark ? "text-[#AABDCF]" : "text-zinc-600")}>This is loss containment, not upsell. Scope is limited to documented urgent items.</p>
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
                    className={cn("w-full text-left p-6 rounded-2xl border transition-all duration-300 group overflow-hidden relative",
                      isDark
                        ? (isSelected ? (opt.val ? "bg-rose-500/10 border-rose-500/40 shadow-2xl" : "bg-white/10 border-white/20 shadow-xl") : "bg-white/[0.02] border-white/[0.05] hover:border-white/20")
                        : (isSelected ? (opt.val ? "bg-rose-50 border-rose-300 shadow-sm" : "bg-white border-zinc-400 shadow-sm") : "bg-white border-zinc-200 hover:bg-zinc-50")
                    )}
                  >
                    <div className="relative z-10 flex items-start gap-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", 
                        isSelected 
                          ? (opt.val ? "bg-rose-500 text-white" : (isDark ? "bg-white text-black" : "bg-zinc-800 text-white")) 
                          : (isDark ? "bg-white/5 text-[#7090B0]" : "bg-zinc-100 text-zinc-500")
                      )}>
                        <opt.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className={cn("font-display font-medium text-lg", 
                          isSelected 
                            ? (isDark ? "text-[#E8EDF8]" : "text-[#1B2B4B]") 
                            : (isDark ? "text-[#DDE5F5] group-hover:text-[#E8EDF8]" : "text-[#1B2B4B] group-hover:text-zinc-900")
                        )}>{opt.label}</p>
                        <p className={cn("text-xs font-light mt-1 transition-colors leading-relaxed", 
                          isDark ? "text-[#7090B0] group-hover:text-[#AABDCF]" : "text-[rgba(27,43,75,0.62)] group-hover:text-zinc-700"
                        )}>{opt.detail}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className={cn("absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30", isDark ? "bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent" : "bg-gradient-to-t from-[#F7F5F1] via-[#F7F5F1]/90 to-transparent")}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          <button onClick={onBack} className={cn("group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-[14px] border transition-all duration-300 shrink-0", isDark ? "bg-white/10 border-white/20 hover:bg-white/20" : "bg-white border-zinc-200 hover:bg-zinc-50")}>
            <ArrowLeft className={cn("w-4 h-4 group-hover:-translate-x-1 transition-transform", isDark ? "text-[#DDE5F5]" : "text-zinc-600")} />
            <span className={cn("text-sm font-display font-medium", isDark ? "text-[#E8EDF8]" : "text-zinc-800")}>Back</span>
          </button>
          <StarButton onClick={handleContinue} disabled={authorized === null} 
            lightColor={isDark ? "#FAFAFA" : "#FFFFFF"} 
            backgroundColor={isDark ? "#060606" : (authorized ? "#B91C1C" : "#1B2B4B")}
            className={cn("flex-1 max-w-md h-20 rounded-[14px] transition-all group",
              authorized === null 
                ? "opacity-20 grayscale" 
                : (isDark ? "shadow-[0_20px_60px_rgba(244,63,94,0.2)] active:scale-95" : "active:scale-95 shadow-sm")
            )}
          >
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">Continue</span>
              <ChevronRight className={cn("w-5 h-5 group-hover:translate-x-1 transition-transform", isDark ? "text-rose-400" : "text-white")} />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}
