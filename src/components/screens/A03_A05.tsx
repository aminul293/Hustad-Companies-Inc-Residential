"use client";

import type { SessionState } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ElegantShape } from "@/components/ui/shape-landing-hero";
import { StarButton } from "@/components/ui/star-button";
import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  Search, 
  Eye, 
  ArrowLeft,
  ChevronRight,
  Camera,
  ClipboardCheck,
  Hammer,
  CreditCard,
  ShieldCheck,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";

import { TestimonialsSection } from "@/components/ui/testimonial-v2";
import { Logos3 } from "@/components/ui/logos3";

interface Props {
  session: SessionState;
  onNext: () => void;
  onBack: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// A03 – What We Inspect
// ─────────────────────────────────────────────────────────────────────────────

export function A03WhatWeInspect({ onNext, onBack }: Props) {
  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606] selection:bg-indigo-500/30 selection:text-white">
      {/* Background Assets: Forensic Rapid Deployment Cloud */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Ambient Gradient Lift */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.08),transparent_70%)]" />

        {/* Forensic HUD Data Layer */}
        <motion.div 
          animate={{ opacity: [0.05, 0.1, 0.05], scale: [1, 1.05, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <img src="/images/forensic_hud.png" alt="" className="w-full h-full object-cover mix-blend-screen opacity-30 grayscale" />
        </motion.div>

        {/* Forensic Inspection Drone - Hovering Top Right */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, x: 100 }}
          animate={{ opacity: 0.2, scale: 1, x: 0, y: [0, -15, 0] }}
          transition={{ duration: 2, y: { duration: 8, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[5%] -right-20 w-[600px] h-[600px]"
        >
          <img src="/images/inspection_drone.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-90" />
        </motion.div>

        {/* Rapid Response Vehicle - Rushing Bottom Left */}
        <motion.div 
          initial={{ opacity: 0, x: -200 }}
          animate={{ opacity: 0.15, x: 0 }}
          transition={{ duration: 1.5, delay: 0.5 }}
          className="absolute -bottom-20 -left-40 w-[800px] h-[800px]"
        >
          <img src="/images/rapid_response.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-80" />
        </motion.div>
      </div>

      {/* Persistent Branding Anchor */}
      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-white text-2xl tracking-[0.1em]">
            HUSTAD
          </span>
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] pt-0.5">
            Madison Residential
          </span>
        </div>
        <div className="mt-2 h-px w-12 bg-gradient-to-r from-white/20 to-transparent" />
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A03_what_we_inspect" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-64 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
              <LayoutGrid className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest pt-0.5">
                Categorization System
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter leading-[1.05]">
              Three categories.
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300 animate-shimmer bg-[length:200%_auto]">
                Clear, honest labels.
              </span>
            </h1>
            <p className="text-xl text-white/30 font-light max-w-2xl leading-relaxed">
              Hustad organizes every finding into one of three categories so
              you understand urgency at a glance.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat, i) => (
              <motion.div 
                key={cat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative bg-white/[0.02] backdrop-blur-3xl p-8 rounded-[32px] border border-white/[0.05] hover:border-white/20 transition-all duration-700 overflow-hidden"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(255,255,255,0.06),transparent_80%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-8 shadow-[0_0_20px_rgba(255,255,255,0.02)] group-hover:scale-110 transition-transform duration-500">
                    <cat.icon className="w-7 h-7 text-white/80 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-2xl font-display font-medium text-white mb-3 tracking-tight">
                    {cat.label}
                  </h3>
                  <p className="text-base text-white/30 font-light leading-relaxed group-hover:text-white/50 transition-colors">
                    {cat.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white/[0.02] border border-white/[0.05] p-10 rounded-[40px] flex items-center"
          >
            <p className="text-lg text-white/30 font-light leading-relaxed italic">
              <span className="text-white font-medium not-italic">Our honest promise:</span> Hustad
              is looking for evidence of real damage, not trying to manufacture
              a replacement. If there is nothing actionable, we will tell you that.
            </p>
          </motion.div>

          {/* New Testimonials Data Layer */}
          <div className="pt-10">
            <TestimonialsSection />
          </div>

          {/* Trusted Partners Logo Bar */}
          <div className="pt-10">
            <Logos3 heading="Trusted by National Asset Managers" />
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 inset-x-0 p-8 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent pt-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <button onClick={onBack} className="group flex items-center gap-3 px-8 py-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300">
            <ArrowLeft className="w-4 h-4 text-white/40 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-white/60">Previous</span>
          </button>
          <StarButton onClick={onNext} lightColor="#FAFAFA" backgroundColor="#060606" className="flex-1 max-w-md h-16 rounded-full active:scale-95 transition-transform">
            <div className="flex items-center gap-4">
              <span className="text-base font-display font-medium tracking-wide">How the Review Works</span>
              <ChevronRight className="w-5 h-5 text-white/60" />
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
    description: "Conditions that create immediate risk of interior damage or structural compromise. These require prompt action.",
  },
  {
    icon: Search,
    label: "Storm-Related Damage",
    description: "Documented hail or wind damage that may qualify for a repair or insurance claim review.",
  },
  {
    icon: Eye,
    label: "Monitor Only",
    description: "Conditions that are not urgent today but should be tracked over the next 1–2 inspection cycles.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// A04 – How Findings Are Sorted
// ─────────────────────────────────────────────────────────────────────────────

export function A04HowFindingsSorted({ onNext, onBack }: Props) {
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

      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none text-white">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A04_how_findings_sorted" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56">
        <div className="max-w-4xl mx-auto space-y-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter leading-[1.05]">
              When the rep returns,
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">here&rsquo;s the sequence.</span>
            </h1>
            <p className="text-xl text-white/30 font-light leading-relaxed">No surprises. No sales pressure. Just a structured walk through what was actually found.</p>
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
                  <h3 className="text-xl font-display font-medium text-white mb-2">{step.title}</h3>
                  <p className="text-base text-white/30 font-light leading-relaxed group-hover:text-white/50 transition-colors">{step.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-8 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent pt-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <button onClick={onBack} className="group flex items-center gap-3 px-8 py-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300">
            <ArrowLeft className="w-4 h-4 text-white/40 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-white/60">Previous</span>
          </button>
          <StarButton onClick={onNext} lightColor="#FAFAFA" backgroundColor="#060606" className="flex-1 max-w-md h-16 rounded-full active:scale-95 transition-transform">
            <div className="flex items-center gap-4">
              <span className="text-base font-display font-medium tracking-wide">Insurance Clarity</span>
              <ChevronRight className="w-5 h-5 text-white/60" />
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

export function A05InsuranceClarity({ onNext, onBack }: Props) {
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

      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none text-white">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A05_insurance_clarity" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56">
        <div className="max-w-5xl mx-auto space-y-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter leading-[1.05]">
              What insurance can and
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">cannot promise you.</span>
            </h1>
            <p className="text-xl text-white/30 font-light leading-relaxed">A few things that are worth knowing before the review — so nothing feels like a surprise later.</p>
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
                <h3 className="text-xl font-display font-medium text-white mb-2">{item.title}</h3>
                <p className="text-sm text-white/30 font-light leading-relaxed group-hover:text-white/50 transition-colors">{item.detail}</p>
              </motion.div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-indigo-500/[0.05] to-transparent border border-white/10 p-10 rounded-[40px]">
            <div className="flex items-start gap-4">
              <ShieldCheck className="w-6 h-6 text-indigo-400 shrink-0 mt-1" />
              <p className="text-base text-white/40 font-light leading-relaxed">
                <span className="text-white font-medium">Note:</span> Coverage decisions belong to your carrier and your policy — not to
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

      <div className="absolute bottom-0 inset-x-0 p-8 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent pt-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <button onClick={onBack} className="group flex items-center gap-3 px-8 py-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300">
            <ArrowLeft className="w-4 h-4 text-white/40 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-white/60">Previous</span>
          </button>
          <StarButton onClick={onNext} lightColor="#FAFAFA" backgroundColor="#060606" className="flex-1 max-w-md h-16 rounded-full active:scale-95 transition-transform">
            <div className="flex items-center gap-4">
              <span className="text-base font-display font-medium tracking-wide">Next Phase</span>
              <ChevronRight className="w-5 h-5 text-white/60" />
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
