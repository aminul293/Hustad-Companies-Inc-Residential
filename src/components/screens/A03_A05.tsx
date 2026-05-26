"use client";

import { useState, useEffect } from "react";
import type { SessionState } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StarButton } from "@/components/ui/star-button";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  AlertCircle,
  Search,
  Eye,
  ArrowLeft,
  ChevronRight,
  Camera,
  ClipboardCheck,
  Hammer,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  LayoutGrid,
  CheckCircle2,
  Package,
  Wrench,
} from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

import { Logos3 } from "@/components/ui/logos3";

interface Props {
  session: SessionState;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (s: SessionState) => void;
}

// Helper to get category styles dynamically based on theme
function getCategoryStyles(color: "rose" | "indigo" | "amber", isActive: boolean, theme: string) {
  if (theme === "high-contrast") {
    return {
      card: isActive ? "bg-white border-2 border-black text-black" : "bg-white border border-black text-black hover:bg-zinc-100",
      icon: "bg-white border border-black text-black",
      iconText: "text-black",
      badge: "bg-white border border-black text-black",
      divider: "border-black",
      titleText: "text-black",
      descText: "text-black",
      detailText: "text-black",
      tapText: "text-black",
    };
  }

  if (theme === "light") {
    if (isActive) {
      const lightActives = {
        rose: {
          card: "border-rose-300 bg-rose-50/70 shadow-sm",
          icon: "bg-rose-100 border border-rose-200",
          iconText: "text-rose-700",
          badge: "bg-rose-50 border border-rose-200 text-rose-800",
          divider: "border-rose-200",
        },
        indigo: {
          card: "border-indigo-300 bg-indigo-50/70 shadow-sm",
          icon: "bg-indigo-100 border border-indigo-200",
          iconText: "text-indigo-700",
          badge: "bg-indigo-50 border border-indigo-200 text-indigo-800",
          divider: "border-indigo-200",
        },
        amber: {
          card: "border-amber-300 bg-amber-50/70 shadow-sm",
          icon: "bg-amber-100 border border-amber-200",
          iconText: "text-amber-700",
          badge: "bg-amber-50 border border-amber-200 text-amber-800",
          divider: "border-amber-200",
        },
      };
      return {
        ...lightActives[color],
        titleText: "text-zinc-900",
        descText: "text-zinc-700",
        detailText: "text-zinc-600",
        tapText: "text-zinc-400",
      };
    } else {
      return {
        card: "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/80 shadow-sm",
        icon: "bg-zinc-100 border border-zinc-200",
        iconText: "text-zinc-500",
        badge: "bg-zinc-50 border border-zinc-200 text-zinc-600",
        divider: "border-zinc-200",
        titleText: "text-zinc-900",
        descText: "text-zinc-600",
        detailText: "text-zinc-500",
        tapText: "text-zinc-400",
      };
    }
  }

  // Dark theme
  if (isActive) {
    const darkActives = {
      rose: {
        card: "border-rose-500/40 bg-rose-500/[0.05] shadow-[0_0_40px_rgba(244,63,94,0.08)]",
        icon: "bg-rose-500/20 border border-rose-500/30",
        iconText: "text-rose-400",
        badge: "bg-rose-500/10 border border-rose-500/20 text-rose-300",
        divider: "border-rose-500/20",
      },
      indigo: {
        card: "border-indigo-500/40 bg-indigo-500/[0.05] shadow-[0_0_40px_rgba(99,102,241,0.1)]",
        icon: "bg-indigo-500/20 border border-indigo-500/30",
        iconText: "text-indigo-400",
        badge: "bg-indigo-500/10 border border-indigo-500/20 text-indigo-300",
        divider: "border-indigo-500/20",
      },
      amber: {
        card: "border-amber-500/40 bg-amber-500/[0.05] shadow-[0_0_40px_rgba(245,158,11,0.08)]",
        icon: "bg-amber-500/20 border border-amber-500/30",
        iconText: "text-amber-400",
        badge: "bg-amber-500/10 border border-amber-500/20 text-amber-300",
        divider: "border-amber-500/20",
      },
    };
    return {
      ...darkActives[color],
      titleText: "text-[#E8EDF8]",
      descText: "text-[#C2D0E4]",
      detailText: "text-[#C2D0E4]",
      tapText: "text-white/[0.18]",
    };
  } else {
    return {
      card: "bg-white/[0.02] border-white/[0.05] hover:border-white/20 hover:bg-white/[0.04]",
      icon: "bg-white/[0.03] border border-white/5",
      iconText: "text-[#C2D0E4]",
      badge: "bg-white/[0.03] border border-white/5 text-[#C2D0E4]",
      divider: "border-white/10",
      titleText: "text-[#E8EDF8]",
      descText: "text-[#3F5878]",
      detailText: "text-[#3F5878]",
      tapText: "text-white/[0.18]",
    };
  }
}

const TESTIMONIALS = [
  "They showed us the photos first, then explained what mattered and what could wait.",
  "The review was clear, local, and easy to understand.",
  "The findings were organized by category, which made the decision easier.",
];

function RotatingTestimonial() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(id);
  }, []);
  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={index}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.4 }}
        className="text-base md:text-lg text-[var(--tx2)] font-light leading-relaxed italic"
      >
        &ldquo;{TESTIMONIALS[index]}&rdquo;
      </motion.p>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// A03 - What We Inspect
// ─────────────────────────────────────────────────────────────────────────────

export function A03WhatWeInspect({ onNext, onBack }: Props) {
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const { theme } = useTheme();
  const isHighContrast = theme === "high-contrast";

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[var(--bg-base)] selection:bg-indigo-500/30 selection:text-[var(--tx1)]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden theme-graphic">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.08),transparent_70%)]" />
        <motion.div
          initial={{ opacity: 0, x: -200 }}
          animate={{ opacity: 0.15, x: 0 }}
          transition={{ duration: 1.5, delay: 0.5 }}
          className="absolute -bottom-20 -left-40 w-[800px] h-[800px]"
        >
          <img src="/images/rapid_response.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-80" />
        </motion.div>
      </div>

      <div className="absolute top-10 left-10 z-30 hidden lg:flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-[var(--tx1)] text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-[var(--tx3)] uppercase tracking-[0.3em] pt-0.5">Madison Residential</span>
        </div>
        <div className="mt-2 h-px w-12 bg-gradient-to-r from-[var(--tx3)]/20 to-transparent" />
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A03_what_we_inspect" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-64 min-h-0">
        <div className="max-w-6xl mx-auto space-y-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-color)] backdrop-blur-md">
              <LayoutGrid className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-500 dark:text-indigo-300 uppercase tracking-widest pt-0.5">Categorization System</span>
            </div>
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[var(--tx1)] tracking-tight leading-[1.05]">
              Three categories.
              <br />
              <span className="text-[var(--tx1)]">Clear, honest labels.</span>
            </h1>
            <p className="text-base md:text-xl text-[var(--tx3)] font-light max-w-2xl leading-relaxed">
              Tap each category to understand what it means and what examples look like.
            </p>
          </motion.div>

          {/* Interactive Category Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat, i) => {
              const styles = getCategoryStyles(cat.color, activeCategory === i, theme);
              const isActive = activeCategory === i;
              return (
                <motion.div
                  key={cat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setActiveCategory(isActive ? null : i)}
                  className={cn(
                    "relative backdrop-blur-3xl p-8 rounded-[32px] border transition-all duration-500 cursor-pointer overflow-hidden",
                    styles.card
                  )}
                >
                  <div className="relative z-10">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500",
                      styles.icon
                    )}>
                      <cat.icon className={cn("w-7 h-7 transition-colors duration-300", styles.iconText)} />
                    </div>
                    <h3 className={cn("text-xl md:text-2xl font-display font-medium mb-3 tracking-tight", styles.titleText)}>{cat.label}</h3>
                    <p className={cn("text-sm md:text-base font-light leading-relaxed", styles.descText)}>{cat.description}</p>

                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className={cn("mt-5 pt-5 border-t space-y-4", styles.divider)}>
                            <p className={cn("text-sm font-light leading-relaxed", styles.detailText)}>{cat.detail}</p>
                            <div className="flex flex-wrap gap-2">
                              {cat.examples.map((ex) => (
                                <span key={ex} className={cn("text-xs font-mono px-3 py-1 rounded-full border", styles.badge)}>{ex}</span>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!isActive && (
                      <p className={cn("text-[10px] font-mono mt-5 tracking-wider", styles.tapText)}>TAP TO EXPLORE</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            whileHover={{ y: -4 }}
            className="bg-[var(--bg-subtle)] border border-[var(--border-color)] p-8 md:p-10 rounded-[40px]"
          >
            <p className="text-base md:text-lg text-[var(--tx2)] font-light leading-relaxed italic">
              <span className="text-[var(--tx1)] font-medium not-italic">Our promise:</span> We look for documented conditions, not a reason to sell a roof. If there is no actionable damage, we will say so.
            </p>
          </motion.div>

          <div className="bg-[var(--bg-subtle)] border border-[var(--border-color)] p-6 md:p-8 rounded-[40px] space-y-3">
            <p className="text-[10px] font-mono text-[var(--tx4)] uppercase tracking-widest">What homeowners appreciate</p>
            <RotatingTestimonial />
            <p className="text-xs text-[var(--tx3)] font-light leading-relaxed">
              Your review may result in no action, monitor-only, repair, documentation for carrier review, or a written scope. We will only recommend what the evidence supports.
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-6 z-30 bg-[var(--bg-base)]/90 backdrop-blur-md border-t border-[var(--border-color)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          <button onClick={onBack} className="group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] transition-all duration-300 shrink-0">
            <ArrowLeft className="w-4 h-4 text-[var(--tx3)] group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-[var(--tx2)]">Previous</span>
          </button>
          <StarButton
            onClick={onNext}
            lightColor={isHighContrast ? "#000000" : "#FAFAFA"}
            backgroundColor={isHighContrast ? "#000000" : "#060606"}
            className={`flex-1 h-14 md:h-20 rounded-full active:scale-95 transition-all group btn-primary ${
              isHighContrast 
                ? "bg-black text-white border-2 border-white" 
                : "text-white shadow-[0_20px_60px_rgba(99,102,241,0.2)]"
            }`}
          >
            <div className="flex items-center justify-center gap-3 md:gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">How the Review Works</span>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}

const CATEGORIES = [
  {
    icon: AlertTriangle,
    label: "Urgent Protection",
    description: "Conditions that could allow water in or create near-term property damage. These need prompt attention.",
    color: "rose" as const,
    detail: "These findings cannot wait. Active leaks, compromised structure, or open exposure. We discuss options before the rep leaves your property.",
    examples: ["Active leaks", "Exposed decking", "Compromised sealants"],
  },
  {
    icon: Search,
    label: "Storm Related Conditions",
    description: "Documented conditions that may be consistent with hail or wind impact. Your carrier determines coverage.",
    color: "indigo" as const,
    detail: "Hail and wind impacts documented with photos, measurements, and timestamps. This supports a carrier review when applicable.",
    examples: ["Hail bruising", "Wind-lifted edges", "Missing shingles"],
  },
  {
    icon: Eye,
    label: "Monitor Only",
    description: "Conditions that do not need action today but should be checked during future maintenance or storm reviews.",
    color: "amber" as const,
    detail: "Not every finding requires immediate action. Some conditions are better tracked, you receive documentation and a recommended re-inspection timeline.",
    examples: ["Early granule wear", "Isolated cracking", "Minor weathering"],
  },
];

// Helper to get step styles dynamically based on theme
function getStepStyles(isActive: boolean, theme: string) {
  if (theme === "high-contrast") {
    return {
      card: isActive ? "bg-white border-2 border-black text-black" : "bg-white border border-black text-black hover:bg-zinc-100",
      badge: "bg-white border border-black text-black",
      badgeText: "text-black",
      titleText: "text-black",
      descText: "text-black",
    };
  }
  if (theme === "light") {
    return {
      card: isActive ? "bg-indigo-50/70 border-indigo-300 shadow-sm" : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/80 shadow-sm",
      badge: isActive ? "bg-indigo-100 border border-indigo-200 text-indigo-700" : "bg-zinc-100 border border-zinc-200 text-zinc-500",
      badgeText: isActive ? "text-indigo-700" : "text-zinc-500",
      titleText: "text-zinc-900",
      descText: isActive ? "text-zinc-700" : "text-zinc-500",
    };
  }
  return {
    card: isActive ? "bg-indigo-500/[0.05] border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.08)]" : "bg-white/[0.02] border-white/[0.05] hover:border-white/20 opacity-60",
    badge: isActive ? "bg-indigo-50/20 border border-indigo-500/30 text-indigo-400" : "bg-white/5 border-white/10 text-[#567090]",
    badgeText: isActive ? "text-indigo-400" : "text-[#567090]",
    titleText: "text-[#E8EDF8]",
    descText: "text-[#3F5878]",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// A04 - How Findings Are Sorted
// ─────────────────────────────────────────────────────────────────────────────

export function A04HowFindingsSorted({ onNext, onBack }: Props) {
  const { theme } = useTheme();
  const isHighContrast = theme === "high-contrast";

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[var(--bg-base)]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden theme-graphic">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.04),transparent_70%)]" />
        <motion.div
          initial={{ opacity: 0, x: 200 }}
          animate={{ opacity: 0.1, x: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute -bottom-20 -right-20 w-[600px] h-[600px]"
        >
          <img src="/images/rapid_response.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-60" />
        </motion.div>
      </div>

      <div className="absolute top-10 left-10 z-30 hidden lg:flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-[var(--tx1)] text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-[var(--tx3)] uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A04_how_findings_sorted" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56 min-h-0">
        <div className="max-w-4xl mx-auto space-y-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[var(--tx1)] tracking-tight leading-[1.05]">
              When your rep returns, you will
              <br />
              <span className="text-[var(--tx1)]">review the evidence together.</span>
            </h1>
            <p className="text-xl text-[var(--tx3)] font-light leading-relaxed mt-8 max-w-2xl">No surprises. No pressure. Just a structured review of what was documented at your home.</p>
          </motion.div>

          <div className="space-y-4">
            {STEPS.map((step, i) => {
              const styles = getStepStyles(true, theme);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className={cn(
                    "flex items-start gap-8 backdrop-blur-xl p-8 rounded-[32px] border",
                    styles.card
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full border flex items-center justify-center font-mono text-sm shrink-0 mt-1",
                    styles.badge
                  )}>
                    {`0${i + 1}`}
                  </div>
                  <div>
                    <h3 className={cn("text-xl font-display font-medium mb-2", styles.titleText)}>{step.title}</h3>
                    <p className={cn("text-base font-light leading-relaxed", styles.descText)}>{step.detail}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INCLUDED_ITEMS.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                className="flex items-start gap-4 bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 rounded-[24px]"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-display font-medium text-[var(--tx1)] mb-1">Included: {item.label}</p>
                  <p className="text-xs text-[var(--tx3)] font-light leading-relaxed">{item.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-[var(--bg-subtle)] border border-[var(--border-color)] p-8 rounded-[32px] flex items-start gap-4">
            <ChevronRight className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-base text-[var(--tx3)] font-light leading-relaxed">
              If another decision-maker is not present, we can provide a shareable summary before anything moves forward.
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-6 z-30 bg-[var(--bg-base)]/90 backdrop-blur-md border-t border-[var(--border-color)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          <button onClick={onBack} className="group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] transition-all duration-300 shrink-0">
            <ArrowLeft className="w-4 h-4 text-[var(--tx3)] group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-[var(--tx2)]">Previous</span>
          </button>
          <StarButton 
            onClick={onNext} 
            lightColor={isHighContrast ? "#000000" : "#FAFAFA"}
            backgroundColor={isHighContrast ? "#000000" : "#060606"}
            className={`flex-1 h-14 md:h-20 rounded-full active:scale-95 transition-all group btn-primary ${
              isHighContrast 
                ? "bg-black text-white border-2 border-white" 
                : "text-white shadow-[0_20px_60px_rgba(99,102,241,0.2)]"
            }`}
          >
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">Insurance Clarity</span>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { title: "Photos first", detail: "Your rep starts with actual photos from your property." },
  { title: "Findings by category", detail: "Items are separated into urgent protection, storm-related conditions, and monitor-only." },
  { title: "Recommended next step", detail: "Your rep explains the recommended path and why it fits the evidence." },
  { title: "Questions before decisions", detail: "You can ask questions before any next step is considered." },
];

const INCLUDED_ITEMS: { label: string; detail: string }[] = [
  { label: "Aerial Review", detail: "High-resolution exterior photos help document conditions that are difficult to see from the ground." },
  { label: "Technical Labels", detail: "Findings are organized by location, category, and recommended next step." },
  { label: "Digital File", detail: "Your photos and summary can be saved for future reference." },
  { label: "Shareable Summary", detail: "Useful when a spouse, co-owner, HOA, or carrier needs a clear recap." },
];

// Helper to get clarity styles dynamically based on theme
function getClarityStyles(isActive: boolean, theme: string) {
  if (theme === "high-contrast") {
    return {
      card: isActive ? "bg-white border-2 border-black text-black" : "bg-white border border-black text-black hover:bg-zinc-100",
      icon: "bg-white border border-black text-black",
      titleText: "text-black",
      descText: "text-black",
    };
  }
  if (theme === "light") {
    return {
      card: isActive ? "bg-indigo-50/70 border-indigo-300 shadow-sm" : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/80 shadow-sm",
      icon: isActive ? "bg-indigo-100 border border-indigo-200 text-indigo-700" : "bg-zinc-100 border border-zinc-200 text-zinc-500",
      titleText: "text-zinc-900",
      descText: "text-zinc-600",
    };
  }
  return {
    card: isActive ? "bg-indigo-500/[0.05] border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.08)]" : "bg-white/[0.02] border-white/[0.05] hover:border-white/20 hover:bg-white/[0.04]",
    icon: isActive ? "bg-indigo-50/20 border border-indigo-500/30 text-indigo-400" : "bg-white/[0.03] border border-white/5 text-indigo-300",
    titleText: "text-[#E8EDF8]",
    descText: "text-[#7090B0]",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// A05 - Insurance Clarity
// ─────────────────────────────────────────────────────────────────────────────

export function A05InsuranceClarity({ onNext, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<"insurance" | "warranty">("insurance");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const { theme } = useTheme();
  const isHighContrast = theme === "high-contrast";

  return (
    <div className={cn(
      "relative flex flex-col h-screen w-full overflow-hidden bg-[var(--bg-base)]",
      theme === "dark" && "bg-[radial-gradient(circle_at_50%_0%,#1e1b4b_0%,#060606_70%)]"
    )}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden theme-graphic">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.08),transparent_70%)]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(99,102,241,0.04),transparent_70%)]" />

        <motion.div 
          initial={{ opacity: 0, x: 200 }}
          animate={{ opacity: 0.18, x: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute -bottom-20 -right-20 w-[700px] h-[700px]"
        >
          <img src="/images/rapid_response.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-80 contrast-110" />
        </motion.div>
      </div>

      <div className="absolute top-10 left-10 z-30 hidden lg:flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-[var(--tx1)] text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-[var(--tx3)] uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A05_insurance_clarity" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56 min-h-0">
        <div className="max-w-5xl mx-auto space-y-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[var(--tx1)] tracking-tight leading-[1.05]">
              Insurance and warranty basics
              <br />
              <span className="text-[var(--tx1)]">before the review.</span>
            </h1>
            <p className="text-xl text-[var(--tx3)] font-light leading-relaxed max-w-2xl">A few simple boundaries help keep the conversation clear.</p>
          </motion.div>

          {/* Tab switcher */}
          <div className="flex gap-2">
            {(["insurance", "warranty"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setExpandedIndex(null); }}
                className={cn(
                  "px-6 py-3 rounded-full text-sm font-display font-medium transition-all duration-300 border",
                  activeTab === tab
                    ? (isHighContrast ? "bg-black text-white border-black" : "bg-[var(--bg-surface)] border-indigo-500/50 text-[var(--tx1)] shadow-sm")
                    : "bg-transparent border-[var(--border-color)] text-[var(--tx3)] hover:text-[var(--tx1)] hover:border-[var(--tx3)]"
                )}
              >
                {tab === "insurance" ? "Insurance Basics" : "Warranty Basics"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "insurance" ? (
              <motion.div key="insurance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="space-y-4">
                {CLARITY_ITEMS.map((item, i) => {
                  const styles = getClarityStyles(expandedIndex === i, theme);
                  const isExpanded = expandedIndex === i;
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      onClick={() => setExpandedIndex(isExpanded ? null : i)}
                      className={cn("group relative backdrop-blur-xl p-6 md:p-8 rounded-[32px] border transition-all duration-500 cursor-pointer overflow-hidden", styles.card)}
                    >
                      <div className="flex items-center gap-6">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors", styles.icon)}>
                          <item.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className={cn("text-xl font-display font-medium tracking-tight", styles.titleText)}>{item.title}</h3>
                        </div>
                        <ChevronRight className={cn("w-5 h-5 text-[#567090] transition-transform duration-300 shrink-0", isExpanded ? "rotate-90 text-indigo-500" : "")} />
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                            <div className="mt-6 pt-6 border-t border-[var(--border-color)] md:pl-[72px]">
                              <p className={cn("text-base font-light leading-relaxed", styles.descText)}>{item.detail}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
                <div className="bg-[var(--bg-subtle)] border border-[var(--border-color)] p-8 rounded-[32px]">
                  <div className="flex items-start gap-4">
                    <ShieldCheck className="w-6 h-6 text-indigo-500 dark:text-indigo-400 shrink-0 mt-1" />
                    <p className="text-base text-[var(--tx2)] font-light leading-relaxed">
                      <span className="text-[var(--tx1)] font-medium">Note: </span>
                      Hustad can document conditions and coordinate with your permission. We cannot decide coverage, waive deductibles, or change policy terms.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="warranty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="space-y-4">
                {WARRANTY_ITEMS.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="group bg-[var(--bg-surface)] backdrop-blur-xl p-6 md:p-8 rounded-[32px] border border-[var(--border-color)] transition-all duration-500"
                  >
                    <div className="flex items-start gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
                        <item.icon className="w-6 h-6 text-[var(--tx3)] group-hover:text-[var(--tx1)] transition-colors" />
                      </div>
                      <div>
                        <h3 className="text-xl font-display font-medium text-[var(--tx1)] mb-2 tracking-tight">{item.title}</h3>
                        <p className="text-base text-[var(--tx3)] font-light leading-relaxed group-hover:text-[var(--tx2)] transition-colors">{item.detail}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                <div className="pt-4 pb-8">
                  <Logos3 heading="Certified installers for trusted manufacturers" />
                  <p className="text-xs text-[var(--tx4)] font-light text-center mt-3">Manufacturer credentials and warranty options are verified before final proposal presentation.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-6 z-30 bg-[var(--bg-base)]/90 backdrop-blur-md border-t border-[var(--border-color)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          <button onClick={onBack} className="group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] transition-all duration-300 shrink-0">
            <ArrowLeft className="w-4 h-4 text-[var(--tx3)] group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-[var(--tx2)]">Previous</span>
          </button>
          <StarButton 
            onClick={onNext} 
            lightColor={isHighContrast ? "#000000" : "#FAFAFA"}
            backgroundColor={isHighContrast ? "#000000" : "#060606"}
            className={`flex-1 h-14 md:h-20 rounded-full active:scale-95 transition-all group btn-primary ${
              isHighContrast 
                ? "bg-black text-white border-2 border-white" 
                : "text-white shadow-[0_20px_60px_rgba(99,102,241,0.2)]"
            }`}
          >
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">Show Warranty Basics</span>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}

const CLARITY_ITEMS = [
  {
    icon: Camera,
    title: "Documentation protects your options.",
    detail: "Photos, dates, and notes help create a clear record of what was found and when it was found.",
  },
  {
    icon: ClipboardCheck,
    title: "Coverage decisions belong to your carrier.",
    detail: "Hustad can document conditions and explain what was observed. Your insurance carrier determines coverage based on your policy.",
  },
  {
    icon: Hammer,
    title: "Contractor choice belongs to you.",
    detail: "You decide who performs the work after you understand the findings and your options.",
  },
  {
    icon: CreditCard,
    title: "Deductibles and policy terms are your responsibility.",
    detail: "We cannot waive deductibles, change policy terms, or decide what your carrier will pay.",
  },
];

const WARRANTY_ITEMS: { icon: React.ElementType; title: string; detail: string }[] = [
  {
    icon: Package,
    title: "Manufacturer Warranty",
    detail: "Covers eligible defects in roofing materials. Terms vary by product and manufacturer.",
  },
  {
    icon: Wrench,
    title: "Workmanship Warranty",
    detail: "Covers eligible installation workmanship issues. This is separate from manufacturer coverage and does not cover storm damage.",
  },
  {
    icon: ShieldAlert,
    title: "Enhanced Manufacturer Warranty Options",
    detail: "Because Hustad installs approved systems through certified installer programs, some projects may qualify for enhanced or extended manufacturer warranty coverage. Eligibility depends on the selected system, required components, registration, and manufacturer approval.",
  },
  {
    icon: AlertCircle,
    title: "Impact Resistant Products",
    detail: "Class 3 and Class 4 ratings are laboratory classifications. They may reduce risk, but they do not make a roof hail-proof or guarantee that future storm damage will not occur.",
  },
];
