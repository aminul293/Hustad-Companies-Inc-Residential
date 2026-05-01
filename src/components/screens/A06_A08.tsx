"use client";

import { useState } from "react";
import type { SessionState } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ElegantShape } from "@/components/ui/shape-landing-hero";
import { StarButton } from "@/components/ui/star-button";
import { motion, AnimatePresence } from "framer-motion";
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

interface Props {
  session: SessionState;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (s: SessionState) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// A06 – Warranty & Impact Clarity
// ─────────────────────────────────────────────────────────────────────────────

export function A06WarrantyImpact({ session, onUpdate, onNext, onBack }: Props) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606] selection:bg-indigo-500/30 selection:text-white">
      {/* Background Assets: Forensic Rapid Deployment Cloud */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
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

        {/* Forensic Inspection Drone - Far Top Right */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.5, x: 200 }}
          animate={{ opacity: 0.1, scale: 0.7, x: 0, y: [0, -20, 0] }}
          transition={{ duration: 2, y: { duration: 15, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[2%] -right-48 w-[450px] h-[450px]"
        >
          <img src="/images/inspection_drone.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-70" />
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
        <ProgressBar currentScreen="A06_warranty_impact" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56">
        <div className="max-w-4xl mx-auto space-y-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
              <ShieldAlert className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest pt-0.5">
                Asset Protection
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter leading-[1.05]">
              Three types of warranty.
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">
                Each one is different.
              </span>
            </h1>
          </motion.div>

          <div className="space-y-4">
            {WARRANTY_TYPES.map((w, i) => (
              <motion.div 
                key={w.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative bg-white/[0.02] backdrop-blur-xl p-8 rounded-[32px] border border-white/[0.05] hover:border-white/20 transition-all duration-500"
              >
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">
                    <w.icon className="w-6 h-6 text-white/70 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-medium text-white mb-2 tracking-tight">
                      {w.label}
                    </h3>
                    <p className="text-base text-white/30 font-light leading-relaxed group-hover:text-white/50 transition-colors">
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
            className="bg-gradient-to-br from-amber-500/[0.05] to-transparent border border-amber-500/20 p-10 rounded-[40px] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldAlert className="w-24 h-24 text-amber-400" />
            </div>
            <div className="relative z-10 flex items-start gap-6">
              <Info className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
              <div className="space-y-2">
                <p className="text-xl font-display font-medium text-white/90">
                  About &ldquo;Impact-Resistant&rdquo; Products
                </p>
                <p className="text-base text-white/40 font-light leading-relaxed">
                  Impact ratings (Class 3, Class 4) are laboratory classifications —
                  not a guarantee that hail will never cause damage. We will be specific
                  about what any product actually offers.
                </p>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col items-center gap-6">
            <button
              onClick={() => setExpanded(!expanded)}
              className="group flex items-center gap-2 text-sm font-mono text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors"
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
                  className="w-full bg-white/[0.02] border border-white/5 p-8 rounded-[32px] overflow-hidden"
                >
                  <p className="text-sm text-white/30 font-light leading-relaxed">
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
            <Logos3 heading="National Scale. Local Expertise." />
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
              <span className="text-base font-display font-medium tracking-wide">Why Hustad Locally</span>
              <ChevronRight className="w-5 h-5 text-white/60" />
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
    detail: "Covers material defects in the roofing products themselves. Duration and terms vary by product family.",
  },
  {
    icon: Wrench,
    label: "Workmanship Warranty",
    detail: "Covers the quality of installation by the contractor. Separate from manufacturer coverage and excludes storm events.",
  },
  {
    icon: ShieldAlert,
    label: "Enhanced System Warranty",
    detail: "Available when a complete qualifying system is installed by a credentialed contractor. Eligibility depends on registration.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// A07 – Why Hustad Locally
// ─────────────────────────────────────────────────────────────────────────────

export function A07WhyHustad({ session, onUpdate, onNext, onBack }: Props) {
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
        <ProgressBar currentScreen="A07_why_hustad" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56">
        <div className="max-w-5xl mx-auto space-y-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter leading-[1.05]">
              Madison roots.
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">Local accountability.</span>
            </h1>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white/[0.03] backdrop-blur-2xl p-12 rounded-[48px] border border-white/10 overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-12 opacity-5">
              <Quote className="w-32 h-32 text-white" />
            </div>
            <div className="relative z-10 space-y-8 max-w-2xl">
              <p className="text-3xl md:text-4xl font-display font-medium text-white/90 leading-tight tracking-tight italic">
                &ldquo;We are here after the weather clears. Our phone still works,
                our crew is still local, and our name is on the work.&rdquo;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-px bg-indigo-500/50" />
                <p className="font-mono text-xs text-white/40 uppercase tracking-[0.3em]">Lee Hustad, Founder</p>
              </div>
            </div>
          </motion.div>

          {/* The Hustad Difference - Authority Section */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-widest pt-0.5">
                The Hustad Difference
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {AUTHORITY_METRICS.map((metric, i) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="bg-white/[0.02] border border-white/[0.05] p-8 rounded-[32px] space-y-4"
                >
                  <div className="text-4xl font-display font-bold text-white tracking-tight">
                    {metric.value}
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-indigo-300 uppercase tracking-wider">
                      {metric.label}
                    </div>
                    <div className="text-xs text-white/30 font-light leading-relaxed">
                      {metric.detail}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {LOCAL_POINTS.map((p, i) => (
              <motion.div 
                key={p.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group bg-white/[0.02] backdrop-blur-xl p-8 rounded-[32px] border border-white/[0.05] hover:border-white/20 transition-all duration-500"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-6">
                  <p.icon className="w-6 h-6 text-indigo-300" />
                </div>
                <h3 className="text-lg font-display font-medium text-white mb-2">{p.label}</h3>
                <p className="text-sm text-white/30 font-light leading-relaxed group-hover:text-white/50 transition-colors">{p.detail}</p>
              </motion.div>
            ))}
          </div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white/[0.02] border border-white/[0.05] p-10 rounded-[40px]"
          >
            <p className="text-lg text-white/30 font-light leading-relaxed italic text-center">
              When the honest finding is <span className="text-white font-medium not-italic">monitor only</span> or{" "}
              <span className="text-white font-medium not-italic">no meaningful damage</span>, we say that — and we leave
              you with documentation, not pressure.
            </p>
          </motion.div>
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
              <span className="text-base font-display font-medium tracking-wide">Walkthrough Package</span>
              <ChevronRight className="w-5 h-5 text-white/60" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}

const LOCAL_POINTS = [
  { icon: MapPin, label: "Madison-Based", detail: "Locally owned and operated in Madison, WI." },
  { icon: Handshake, label: "Accountability", detail: "We answer local calls after the season ends." },
  { icon: CheckSquare, label: "Honest Findings", detail: "Including monitor only when that is the right answer." },
  { icon: FileText, label: "Clean Records", detail: "You keep a record whether or not a project begins." },
];

// ─────────────────────────────────────────────────────────────────────────────
// A08 – What You Will Receive Today
// ─────────────────────────────────────────────────────────────────────────────

export function A08WhatYouReceive({ session, onUpdate, onNext, onBack }: Props) {
  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606]">
      {/* Background Assets: Forensic Intelligence Cloud */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Thermal Scan - Top Left */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.12, y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-[-5%] w-[600px] h-[600px]"
        >
          <img src="/images/thermal_scan.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-50 grayscale" />
        </motion.div>
      </div>

      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none text-white">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A08_what_you_receive" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56">
        <div className="max-w-5xl mx-auto space-y-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter leading-[1.05]">
              Here is exactly what
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">the rep will bring back.</span>
            </h1>
            <p className="text-xl text-white/30 font-light leading-relaxed">When the exterior review is complete, you will receive a structured findings package — not a verbal summary.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {DELIVERABLES.map((d, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="group relative bg-white/[0.02] backdrop-blur-xl p-8 rounded-[32px] border border-white/[0.05] hover:border-white/20 transition-all duration-500"
              >
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">
                    <d.icon className="w-7 h-7 text-white/70 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-medium text-white mb-2">{d.title}</h3>
                    <p className="text-base text-white/30 font-light leading-relaxed group-hover:text-white/50 transition-colors">{d.detail}</p>
                  </div>
                </div>
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5 text-indigo-400" />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-white/[0.02] border border-white/10 p-10 rounded-[40px] flex items-center gap-6">
            <Send className="w-6 h-6 text-indigo-400 shrink-0" />
            <p className="text-base text-white/40 font-light leading-relaxed italic">
              If another decision-maker is not present today, a shareable summary
              can be sent to them before any agreement is considered.
            </p>
          </div>

          {/* Trusted Partners Logo Bar */}
          <div className="pt-10 pb-20">
            <Logos3 heading="Your Asset is in Professional Hands" />
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
              <span className="text-base font-display font-medium tracking-wide">Tell Us What Matters</span>
              <ChevronRight className="w-5 h-5 text-white/60" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}

const DELIVERABLES = [
  { icon: Camera, title: "Photo findings", detail: "Actual images from your property, not stock photos." },
  { icon: Layers, title: "Separation by category", detail: "Urgent, storm-related, and monitor-only conditions labeled clearly." },
  { icon: ArrowRight, title: "Next step path", detail: "A single, honest recommendation based only on what was documented." },
  { icon: Send, title: "Shareable summary", detail: "A takeaway you can send to a spouse, co-owner, or family member." },
];

const AUTHORITY_METRICS = [
  {
    value: "$100M+",
    label: "Claims Restored",
    detail: "Total property insurance claims successfully restored since inception.",
  },
  {
    value: "1973",
    label: "Established",
    detail: "Over 45 years of continuous service and forensic roofing expertise.",
  },
  {
    value: "One-Stop",
    label: "Exterior Shop",
    detail: "Full-service recovery including roofing, siding, gutters, and windows.",
  },
];
