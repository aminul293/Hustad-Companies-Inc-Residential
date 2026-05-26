"use client";

import { useState } from "react";
import type { SessionState } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StarButton } from "@/components/ui/star-button";
import { motion, AnimatePresence, useMotionValue, useSpring, useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import { 
  Package, 
  Wrench, 
  ShieldAlert, 
  ArrowLeft, 
  ChevronRight, 
  Info, 
  Quote, 
  MapPin, 
  Handshake, 
  CheckSquare, 
  FileText, 
  Camera, 
  Layers, 
  Send, 
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logos3 } from "@/components/ui/logos3";
import { useTheme } from "@/components/ThemeProvider";

interface Props {
  session: SessionState;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (s: SessionState) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Counter Component (for A07)
// ─────────────────────────────────────────────────────────────────────────────

function Counter({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Intl.NumberFormat("en-US").format(Math.floor(latest));
      }
    });
    return () => unsubscribe();
  }, [springValue]);

  return (
    <span className="inline-flex items-baseline">
      {prefix}
      <span ref={ref}>0</span>
      {suffix}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// A06 - Warranty & Impact Clarity
// ─────────────────────────────────────────────────────────────────────────────

export function A06WarrantyImpact({ session, onUpdate, onNext, onBack }: Props) {
  const { theme } = useTheme();
  const isHighContrast = theme === "high-contrast";
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[var(--bg-base)] text-[var(--tx1)] selection:bg-indigo-500/30 selection:text-[var(--tx1)]">
      {/* Background Assets: Rapid Deployment Cloud */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden theme-graphic">
        {/* Ambient Gradient Lift - Softer */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.04),transparent_70%)]" />

        {/* National Mobilization Map - Ultra Subtle Accountability */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.05, scale: 0.85, y: [0, -15, 0] }}
          transition={{ duration: 2, y: { duration: 25, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[10%] -left-32 w-[550px] h-[550px]"
        >
          <img src="/images/mobilization_map.png" alt="" className="w-full h-full object-contain mix-blend-screen grayscale" />
        </motion.div>

      </div>

      {/* Persistent Branding Anchor */}
      <div className="absolute top-10 left-10 z-30 hidden lg:flex flex-col items-start pointer-events-none text-[var(--tx1)]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-2xl tracking-[0.1em]">
            HUSTAD
          </span>
          <span className="text-[10px] font-mono text-[var(--tx3)] uppercase tracking-[0.3em] pt-0.5">
            Madison Residential
          </span>
        </div>
        <div className="mt-2 h-px w-12 bg-gradient-to-r from-[var(--border-color)] to-transparent" />
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A06_warranty_impact" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56 min-h-0">
        <div className="max-w-4xl mx-auto space-y-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] backdrop-blur-md">
              <ShieldAlert className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-300 uppercase tracking-widest pt-0.5">
                Property Protection
              </span>
            </div>
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[var(--tx1)] tracking-tight leading-[1.05]">
              Three types of warranty.
              <br />
              <span className="text-[var(--tx1)]">
                Each one is different.
              </span>
            </h1>
            <p className="text-xl text-[var(--tx3)] font-light leading-relaxed mt-4 max-w-2xl">
              A warranty is not one blanket promise. Coverage depends on the product, the installer, the system, registration, and final warranty documents.
            </p>
          </motion.div>

          <div className="space-y-4">
            {WARRANTY_TYPES.map((w, i) => (
              <motion.div 
                key={w.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative bg-[var(--bg-surface)] backdrop-blur-xl p-8 rounded-[32px] border border-[var(--border-color)] transition-all duration-500"
              >
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
                    <w.icon className="w-6 h-6 text-[var(--tx3)] group-hover:text-[var(--tx1)] transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-medium text-[var(--tx1)] mb-2 tracking-tight">
                      {w.label}
                    </h3>
                    <p className="text-base text-[var(--tx3)] font-light leading-relaxed group-hover:text-[var(--tx2)] transition-colors">
                      {w.detail}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[var(--bg-subtle)] border border-[var(--border-color)] p-10 rounded-[40px] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldAlert className="w-24 h-24 text-amber-500" />
            </div>
            <div className="relative z-10 flex items-start gap-6">
              <Info className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
              <div className="space-y-2">
                <p className="text-xl font-display font-medium text-[var(--tx1)]">
                  About &ldquo;Impact-Resistant&rdquo; Products
                </p>
                <p className="text-base text-[var(--tx3)] font-light leading-relaxed">
                  Class 3 and Class 4 ratings are laboratory classifications. They can reduce risk, but they do not guarantee hail will never cause damage. We will be specific about what any product actually offers.
                </p>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col items-center gap-6">
            <button
              onClick={() => setExpanded(!expanded)}
              className="group flex items-center gap-2 text-sm font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
            >
              <span>{expanded ? "Show less detail" : "More detail on warranty layers"}</span>
              <ChevronRight className={cn("w-4 h-4 transition-transform duration-500", expanded ? "rotate-90" : "group-hover:translate-x-1")} />
            </button>
            
            <AnimatePresence>
              {expanded && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] p-8 rounded-[32px] overflow-hidden"
                >
                  <p className="text-sm text-[var(--tx3)] font-light leading-relaxed">
                    Final warranty terms depend on the manufacturer, product family, required accessories,
                    contractor credentials, and registration. Specific terms, workmanship duration, and
                    eligibility will be confirmed in your proposal. Do not rely on warranty labels until
                    the final agreement is issued.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Trusted Partners Logo Bar */}
          <div className="pt-10">
            <Logos3 />
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
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">Why Hustad Locally</span>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}

const WARRANTY_TYPES = [
  {
    icon: Package,
    label: "Manufacturer Warranty",
    detail: "Covers eligible defects in roofing materials. Terms vary by product and manufacturer.",
  },
  {
    icon: Wrench,
    label: "Workmanship Warranty",
    detail: "Covers eligible installation workmanship issues. It is separate from manufacturer coverage and does not cover storm damage.",
  },
  {
    icon: ShieldAlert,
    label: "Enhanced System Warranty",
    detail: "May be available when qualifying products are installed as a complete system by a credentialed contractor. Registration and manufacturer rules apply.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// A07 - Why Hustad Locally
// ─────────────────────────────────────────────────────────────────────────────

export function A07WhyHustad({ session, onUpdate, onNext, onBack }: Props) {
  const { theme } = useTheme();
  const isHighContrast = theme === "high-contrast";

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[var(--bg-base)] text-[var(--tx1)]">
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

      <div className="absolute top-10 left-10 z-30 hidden lg:flex flex-col items-start pointer-events-none text-[var(--tx1)]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-[var(--tx3)] uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A07_why_hustad" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56 min-h-0">
        <div className="max-w-5xl mx-auto space-y-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[var(--tx1)] tracking-tight leading-[1.05]">
              Madison roots.
              <br />
              <span className="text-[var(--tx1)]">Local accountability.</span>
            </h1>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-[var(--bg-surface)] backdrop-blur-2xl p-12 rounded-[48px] border border-[var(--border-color)] overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-12 opacity-5">
              <Quote className="w-32 h-32 text-[var(--tx1)]" />
            </div>
            <div className="relative z-10 space-y-8 max-w-2xl">
              <p className="text-3xl md:text-4xl font-display font-medium text-[var(--tx2)] leading-tight tracking-tight italic">
                &ldquo;We are here after the weather clears. Our team is local,
                our work is documented, and our name stays on the job.&rdquo;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-px bg-indigo-500/50" />
                <p className="font-mono text-xs text-[var(--tx3)] uppercase tracking-[0.3em]">Lee Hustad, Founder</p>
              </div>
            </div>
          </motion.div>

          {/* The Hustad Difference */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] backdrop-blur-md">
              <ShieldCheck className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-300 uppercase tracking-widest pt-0.5">
                The Hustad Difference
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {LOCAL_POINTS.map((p, i) => (
              <motion.div 
                key={p.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group bg-[var(--bg-surface)] backdrop-blur-xl p-8 rounded-[32px] border border-[var(--border-color)] transition-all duration-500"
              >
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center justify-center mb-6">
                  <p.icon className="w-6 h-6 text-indigo-500 dark:text-indigo-300" />
                </div>
                <h3 className="text-lg font-display font-medium text-[var(--tx1)] mb-2">{p.label}</h3>
                <p className="text-sm text-[var(--tx3)] font-light leading-relaxed group-hover:text-[var(--tx2)] transition-colors">{p.detail}</p>
              </motion.div>
            ))}
          </div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-10 rounded-[40px]"
          >
            <p className="text-lg text-[var(--tx3)] font-light leading-relaxed italic text-center">
              When the honest finding is <span className="text-[var(--tx1)] font-medium not-italic">monitor only</span> or{" "}
              <span className="text-[var(--tx1)] font-medium not-italic">no meaningful damage</span>, we say that, and we leave
              you with documentation, not pressure.
            </p>
          </motion.div>
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
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">Show My Review Package</span>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}

const LOCAL_POINTS = [
  { icon: MapPin, label: "Madison Based", detail: "Locally owned and operated in Madison, WI." },
  { icon: Handshake, label: "One Exterior Partner", detail: "Roofing, siding, gutters, windows, and storm restoration support." },
  { icon: CheckSquare, label: "Honest Findings", detail: "If the right answer is monitor-only, we will say so." },
  { icon: FileText, label: "Clean Records", detail: "You keep organized documentation whether or not a project begins." },
];

const AUTHORITY_METRICS = [
  {
    value: "$100M+",
    label: "Work Completed",
    detail: "Exterior restoration work completed.",
  },
  {
    value: "1973",
    label: "Established",
    detail: "Over 45 years of continuous service and storm restoration experience.",
  },
  {
    value: "One Partner",
    label: "Exterior Shop",
    detail: "Full-service recovery including roofing, siding, gutters, and windows.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// A08 - What You Will Receive Today
// ─────────────────────────────────────────────────────────────────────────────

export function A08WhatYouReceive({ session, onUpdate, onNext, onBack }: Props) {
  const { theme } = useTheme();
  const isHighContrast = theme === "high-contrast";
  const [checkedItems, setCheckedItems] = useState<number[]>([]);

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[var(--bg-base)] text-[var(--tx1)]">
      {/* Background Assets: Intelligence Cloud */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden theme-graphic">
        {/* Documented Scan - Top Left */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.12, y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-[-5%] w-[600px] h-[600px]"
        >
          <img src="/images/thermal_scan.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-50 grayscale" />
        </motion.div>
      </div>

      <div className="absolute top-10 left-10 z-30 hidden lg:flex flex-col items-start pointer-events-none text-[var(--tx1)]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-[var(--tx3)] uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A08_what_you_receive" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56 min-h-0">
        <div className="max-w-5xl mx-auto space-y-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[var(--tx1)] tracking-tight leading-[1.05]">
              Here is what
              <br />
              <span className="text-[var(--tx1)]">your rep will bring back.</span>
            </h1>
            <p className="text-xl text-[var(--tx3)] font-light leading-relaxed mt-8 max-w-2xl">
              When the exterior review is complete, you receive a structured findings package, not just a verbal summary.
            </p>
          </motion.div>

          {/* Top Progress Bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-indigo-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(checkedItems.length / DELIVERABLES.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="text-sm font-mono text-indigo-500 dark:text-indigo-400">
              {checkedItems.length}/{DELIVERABLES.length} Selected
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {DELIVERABLES.map((d, i) => {
              const isChecked = checkedItems.includes(i);
              return (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => {
                  if (isChecked) {
                    setCheckedItems(prev => prev.filter(item => item !== i));
                  } else {
                    setCheckedItems(prev => [...prev, i]);
                  }
                }}
                className={cn(
                  "group relative backdrop-blur-xl p-8 rounded-[32px] border transition-all duration-500 cursor-pointer",
                  isChecked 
                    ? "bg-indigo-500/[0.08] border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.12)]"
                    : "bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-white/20"
                )}
              >
                <div className="flex items-start gap-6">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                    isChecked ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-500 dark:text-indigo-400" : "bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--tx3)] group-hover:text-[var(--tx1)]"
                  )}>
                    <d.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-medium text-[var(--tx1)] mb-2">{d.title}</h3>
                    <p className="text-base text-[var(--tx3)] font-light leading-relaxed group-hover:text-[var(--tx2)] transition-colors">{d.detail}</p>
                  </div>
                </div>
                <div className="absolute top-6 right-6 transition-opacity">
                  <div className={cn(
                    "w-6 h-6 rounded-full border flex items-center justify-center transition-colors",
                    isChecked ? "bg-indigo-500 border-indigo-500 text-white" : "border-[var(--border-color)] text-transparent"
                  )}>
                    <CheckSquare className="w-3 h-3" />
                  </div>
                </div>
              </motion.div>
            )})}
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-10 rounded-[40px] flex items-center gap-6">
            <Send className="w-6 h-6 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <p className="text-base text-[var(--tx3)] font-light leading-relaxed italic">
              If another decision-maker is not present, your rep can send a shareable summary before any next step is considered.
            </p>
          </div>

          {/* Trusted Partners Logo Bar */}
          <div className="pt-10 pb-20">
            <Logos3 />
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
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">Tell Us What Matters Most</span>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}

const DELIVERABLES = [
  { icon: Camera, title: "Photo findings", detail: "Actual images from your property." },
  { icon: Layers, title: "Findings by category", detail: "Urgent protection, storm-related damage, and monitor-only items clearly labeled." },
  { icon: ArrowRight, title: "Recommended next step", detail: "One clear recommendation based on what was documented." },
  { icon: Send, title: "Shareable summary", detail: "A takeaway you can send to a spouse, co-owner, or other decision-maker." },
];
