"use client";

import { useState } from "react";
import type { SessionState } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StarButton } from "@/components/ui/star-button";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Search,
  Eye,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Camera,
  ClipboardCheck,
  Hammer,
  CreditCard,
  ShieldCheck,
  LayoutGrid,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { TestimonialsSection } from "@/components/ui/testimonial-v2";
import { Logos3 } from "@/components/ui/logos3";

interface Props {
  session: SessionState;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (s: SessionState) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// A03 – What We Inspect
// ─────────────────────────────────────────────────────────────────────────────

const CAT_COLORS = {
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
} as const;

export function A03WhatWeInspect({ onNext, onBack }: Props) {
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606] selection:bg-indigo-500/30 selection:text-[#E8EDF8]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.08),transparent_70%)]" />
        <motion.div
          animate={{ opacity: [0.05, 0.1, 0.05], scale: [1, 1.05, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <img src="/images/forensic_hud.png" alt="" className="w-full h-full object-cover mix-blend-screen opacity-30 grayscale" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: 100 }}
          animate={{ opacity: 0.2, scale: 1, x: 0, y: [0, -15, 0] }}
          transition={{ duration: 2, y: { duration: 8, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[5%] -right-20 w-[600px] h-[600px]"
        >
          <img src="/images/inspection_drone.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-90" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -200 }}
          animate={{ opacity: 0.15, x: 0 }}
          transition={{ duration: 1.5, delay: 0.5 }}
          className="absolute -bottom-20 -left-40 w-[800px] h-[800px]"
        >
          <img src="/images/rapid_response.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-80" />
        </motion.div>
      </div>

      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-[#E8EDF8] text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-[#2D4060] uppercase tracking-[0.3em] pt-0.5">Madison Residential</span>
        </div>
        <div className="mt-2 h-px w-12 bg-gradient-to-r from-white/20 to-transparent" />
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A03_what_we_inspect" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-64">
        <div className="max-w-6xl mx-auto space-y-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
              <LayoutGrid className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest pt-0.5">Categorization System</span>
            </div>
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[#E8EDF8] tracking-tight leading-[1.05]">
              Three categories.
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-indigo-300">Clear, honest labels.</span>
            </h1>
            <p className="text-base md:text-xl text-[#3F5878] font-light max-w-2xl leading-relaxed">
              Tap each category to understand what it means and what examples look like.
            </p>
          </motion.div>

          {/* Interactive Category Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat, i) => {
              const colors = CAT_COLORS[cat.color];
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
                    isActive ? colors.card : "bg-white/[0.02] border-white/[0.05] hover:border-white/20 hover:bg-white/[0.04]"
                  )}
                >
                  <div className="relative z-10">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500",
                      isActive ? colors.icon : "bg-white/[0.03] border border-white/5"
                    )}>
                      <cat.icon className={cn("w-7 h-7 transition-colors duration-300", isActive ? colors.iconText : "text-[#C2D0E4]")} />
                    </div>
                    <h3 className="text-xl md:text-2xl font-display font-medium text-[#E8EDF8] mb-3 tracking-tight">{cat.label}</h3>
                    <p className="text-sm md:text-base text-[#3F5878] font-light leading-relaxed">{cat.description}</p>

                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className={cn("mt-5 pt-5 border-t space-y-4", colors.divider)}>
                            <p className="text-sm text-[#7090B0] font-light leading-relaxed">{cat.detail}</p>
                            <div className="flex flex-wrap gap-2">
                              {cat.examples.map((ex) => (
                                <span key={ex} className={cn("text-xs font-mono px-3 py-1 rounded-full border", colors.badge)}>{ex}</span>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!isActive && (
                      <p className="text-[10px] font-mono text-white/[0.18] mt-5 tracking-wider">TAP TO EXPLORE</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white/[0.02] border border-white/[0.05] p-8 md:p-10 rounded-[40px]"
          >
            <p className="text-base md:text-lg text-[#3F5878] font-light leading-relaxed italic">
              <span className="text-[#E8EDF8] font-medium not-italic">Our honest promise:</span> Hustad is looking for evidence of real damage, not trying to manufacture a replacement. If there is nothing actionable, we will tell you that.
            </p>
          </motion.div>

          <div className="pt-6">
            <TestimonialsSection />
          </div>
          <div className="pt-4">
            <Logos3 heading="Trusted by National Asset Managers" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          <button onClick={onBack} className="group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 shrink-0">
            <ArrowLeft className="w-4 h-4 text-[#567090] group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-[#8BA5C5]">Previous</span>
          </button>
          <StarButton onClick={onNext} lightColor="#FAFAFA" backgroundColor="#060606" className="flex-1 h-14 md:h-20 rounded-full shadow-[0_20px_60px_rgba(99,102,241,0.2)] active:scale-95 transition-all group">
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
    description: "Conditions that create immediate risk of interior damage or structural compromise.",
    color: "rose" as const,
    detail: "These findings cannot wait. Active leaks, compromised structure, or open exposure. We discuss options before the rep leaves your property.",
    examples: ["Active leaks", "Exposed decking", "Compromised sealants"],
  },
  {
    icon: Search,
    label: "Storm-Related Damage",
    description: "Documented hail or wind damage that may qualify for a repair or insurance claim review.",
    color: "indigo" as const,
    detail: "Hail and wind impacts documented with photos, measurements, and timestamps. This supports a carrier review when applicable.",
    examples: ["Hail bruising", "Wind-lifted edges", "Missing shingles"],
  },
  {
    icon: Eye,
    label: "Monitor Only",
    description: "Conditions that are not urgent today but should be tracked over the next 1–2 inspection cycles.",
    color: "amber" as const,
    detail: "Not every finding requires immediate action. Some conditions are better tracked — you receive documentation and a recommended re-inspection timeline.",
    examples: ["Early granule wear", "Isolated cracking", "Minor weathering"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// A04 – How Findings Are Sorted
// ─────────────────────────────────────────────────────────────────────────────

export function A04HowFindingsSorted({ session, onUpdate, onNext, onBack }: Props) {
  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606]">
      {/* Background Assets: Rapid Deployment Cloud */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Forensic Inspection Drone - Hovering Top Left */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, x: -100 }}
          animate={{ opacity: 0.08, scale: 1, x: 0, y: [0, -20, 0] }}
          transition={{ duration: 2, y: { duration: 10, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[10%] -left-20 w-[500px] h-[500px]"
        >
          <img src="/images/inspection_drone.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-70" />
        </motion.div>

        {/* Rapid Response Vehicle - Rushing Bottom Right */}
        <motion.div 
          initial={{ opacity: 0, x: 200 }}
          animate={{ opacity: 0.1, x: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute -bottom-20 -right-20 w-[600px] h-[600px]"
        >
          <img src="/images/rapid_response.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-60" />
        </motion.div>
      </div>

      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none text-[#E8EDF8]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-[#2D4060] uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A04_how_findings_sorted" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56">
        <div className="max-w-4xl mx-auto space-y-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[#E8EDF8] tracking-tight leading-[1.05]">
              When the rep returns,
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-indigo-300">here&rsquo;s the sequence.</span>
            </h1>
            <p className="text-xl text-[#3F5878] font-light leading-relaxed mt-8 max-w-2xl">No surprises. No sales pressure. Just a structured walk through what was actually found on your property.</p>
          </motion.div>

          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group flex items-start gap-8 bg-white/[0.02] backdrop-blur-xl p-8 rounded-[32px] border border-white/[0.05] hover:border-white/20 transition-all duration-500"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-mono text-sm shrink-0">
                  0{i + 1}
                </div>
                <div>
                  <h3 className="text-xl font-display font-medium text-[#E8EDF8] mb-2">{step.title}</h3>
                  <p className="text-base text-[#3F5878] font-light leading-relaxed group-hover:text-[#7090B0] transition-colors">{step.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          <button onClick={onBack} className="group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 shrink-0">
            <ArrowLeft className="w-4 h-4 text-[#567090] group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-[#8BA5C5]">Previous</span>
          </button>
          <StarButton 
            onClick={onNext} 
            lightColor="#FAFAFA" 
            backgroundColor="#060606" 
            className="flex-1 h-14 md:h-20 rounded-full shadow-[0_20px_60px_rgba(99,102,241,0.2)] active:scale-95 transition-all group"
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
  { title: "Photos first", detail: "The rep will show the actual documented evidence — not a generic damage description." },
  { title: "Category separation", detail: "Findings are sorted into urgent, storm-related, and monitor-only before any recommendation is made." },
  { title: "One recommended next step", detail: "Based on what was found, the rep will recommend exactly one path. Not a menu." },
  { title: "Your questions, answered", detail: "Time for you to ask anything before any decision is made." },
];

// ─────────────────────────────────────────────────────────────────────────────
// A05 – Insurance Clarity
// ─────────────────────────────────────────────────────────────────────────────

export function A05InsuranceClarity({ session, onUpdate, onNext, onBack }: Props) {
  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#1e1b4b_0%,#060606_70%)]">
      {/* Background Assets: Forensic Rapid Deployment Cloud */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Ambient Gradient Lift */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.08),transparent_70%)]" />

        {/* Forensic HUD Data Layer */}
        <motion.div 
          animate={{ opacity: [0.05, 0.1, 0.05], scale: [1, 1.03, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <img src="/images/forensic_hud.png" alt="" className="w-full h-full object-cover mix-blend-screen opacity-30 grayscale" />
        </motion.div>

        {/* Thermal Scan - Top Left */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.18, y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-[-5%] w-[600px] h-[600px]"
        >
          <img src="/images/thermal_scan.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-80 grayscale" />
        </motion.div>

        {/* Rapid Response Vehicle - Rushing Bottom Right */}
        <motion.div 
          initial={{ opacity: 0, x: 200 }}
          animate={{ opacity: 0.18, x: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute -bottom-20 -right-20 w-[700px] h-[700px]"
        >
          <img src="/images/rapid_response.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-80 contrast-110" />
        </motion.div>
      </div>

      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none text-[#E8EDF8]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-[#2D4060] uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A05_insurance_clarity" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56">
        <div className="max-w-5xl mx-auto space-y-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[#E8EDF8] tracking-tight leading-[1.05]">
              What insurance can and
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-indigo-300">cannot promise you.</span>
            </h1>
            <p className="text-xl text-[#3F5878] font-light leading-relaxed mt-8 max-w-2xl">A few things that are worth knowing before the review — so nothing feels like a surprise later.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CLARITY_ITEMS.map((item, i) => (
              <motion.div 
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group bg-white/[0.02] backdrop-blur-xl p-8 rounded-[32px] border border-white/[0.05] hover:border-white/20 transition-all duration-500"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-6">
                  <item.icon className="w-6 h-6 text-indigo-300" />
                </div>
                <h3 className="text-xl font-display font-medium text-[#E8EDF8] mb-2">{item.title}</h3>
                <p className="text-sm text-[#3F5878] font-light leading-relaxed group-hover:text-[#7090B0] transition-colors">{item.detail}</p>
              </motion.div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-indigo-500/[0.05] to-transparent border border-white/10 p-10 rounded-[40px]">
            <div className="flex items-start gap-4">
              <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0 mt-1" />
              <p className="text-base text-[#567090] font-light leading-relaxed">
                <span className="text-[#E8EDF8] font-medium">Note:</span> Coverage decisions belong to your carrier and your policy — not to
                your contractor. Hustad can document damage and coordinate with your
                permission, but we do not negotiate claims on your behalf.
              </p>
            </div>
          </div>

          {/* Trusted Partners Logo Bar */}
          <div className="pt-10 pb-20">
            <Logos3 heading="Preferred Partner For" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          <button onClick={onBack} className="group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 shrink-0">
            <ArrowLeft className="w-4 h-4 text-[#567090] group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-[#8BA5C5]">Previous</span>
          </button>
          <StarButton 
            onClick={onNext} 
            lightColor="#FAFAFA" 
            backgroundColor="#060606" 
            className="flex-1 h-14 md:h-20 rounded-full shadow-[0_20px_60px_rgba(99,102,241,0.2)] active:scale-95 transition-all group"
          >
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">Next Phase</span>
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
    title: "Documentation protects you.",
    detail: "Prompt documentation of storm damage preserves your ability to file a claim within policy timeframes.",
  },
  {
    icon: ClipboardCheck,
    title: "Coverage decisions belong to your carrier.",
    detail: "Your policy and adjuster determine what is covered. A contractor cannot promise an outcome.",
  },
  {
    icon: Hammer,
    title: "Contractor choice belongs to you.",
    detail: "Filing an insurance claim does not require you to choose any specific contractor.",
  },
  {
    icon: CreditCard,
    title: "Deductibles remain your responsibility.",
    detail: "Your deductible is owed to your carrier and cannot be waived or absorbed by a contractor.",
  },
];
