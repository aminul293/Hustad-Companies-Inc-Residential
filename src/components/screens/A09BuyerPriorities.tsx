"use client";

import { useState } from "react";
import type { SessionState, BuyerPriority, InsurerContactStatus } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ElegantShape } from "@/components/ui/shape-landing-hero";
import { StarButton } from "@/components/ui/star-button";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Zap, 
  ShieldCheck, 
  FileText, 
  DollarSign, 
  Waves,
  ArrowLeft,
  ChevronRight,
  UserPlus,
  MessageSquare,
  Check,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";

function SplineSceneBasic() {
  return (
    <Card className="w-full h-[500px] bg-white/[0.02] backdrop-blur-3xl relative overflow-hidden border-white/[0.05] rounded-[48px] mb-12">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      
      <div className="flex flex-col md:flex-row h-full">
        {/* Left content */}
        <div className="flex-1 p-12 relative z-10 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6 w-fit">
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest">Active Protection System</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-display font-medium text-white tracking-tight leading-[1.05]">
              What matters <br /> most to you?
            </h1>
            <p className="mt-6 text-neutral-400 text-lg font-light max-w-md leading-relaxed">
              The Hustad is standing by. Tell us what you value most, and we will tailor the forensic review to your home's unique protection needs.
            </p>
          </motion.div>
        </div>

        {/* Right content: Interactive 3D Robot with Protected Holographic Home */}
        <div className="flex-1 relative min-h-[500px] group">
          <div className="absolute inset-0 z-0">
            <SplineScene 
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
            />
          </div>
          
          {/* Holographic Home & Protection Shield (Definitive Fix) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: [0.8, 1, 0.8],
              scale: [0.85, 0.9, 0.85],
              y: [0, -10, 0],
            }}
            transition={{ 
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-[55%] left-[11%] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
          >
            <div className="relative flex items-center justify-center">
              {/* Primary Energy Shield Shielding the Property */}
              <div className="absolute inset-0 rounded-full bg-indigo-500/10 border border-indigo-400/30 shadow-[0_0_100px_rgba(129,140,248,0.5)] scale-[2.2] animate-pulse" />
              
              <div className="relative w-80 h-80 flex items-center justify-center overflow-hidden">
                <img 
                  src="/images/holographic_house.png" 
                  alt="Hustad Protection Target" 
                  className="w-full h-full object-contain mix-blend-screen filter hue-rotate-[180deg] brightness-[1.8] contrast-[1.8] saturate-[1.6] drop-shadow-[0_0_50px_rgba(129,140,248,1)]"
                  style={{
                    clipPath: 'circle(42% at 50% 50%)',
                    WebkitClipPath: 'circle(42% at 50% 50%)'
                  }}
                />
              </div>
              
              {/* Active Protection Status Label */}
              <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/40 backdrop-blur-2xl shadow-[0_0_20px_rgba(129,140,248,0.2)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,1)] animate-pulse" />
                  <span className="text-[10px] font-mono text-indigo-100 uppercase tracking-[0.3em] whitespace-nowrap">Asset Fully Protected</span>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Interaction Hint */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center gap-3">
            <Shield className="w-3 h-3 text-indigo-400" />
            <span className="text-[9px] font-mono text-indigo-300 uppercase tracking-[0.2em]">The Hustad is protecting your home</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

interface Props {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
}
// ... rest of the component

const PRIORITIES = [
  { value: "roof_longevity" as BuyerPriority, label: "Roof Longevity", detail: "Durable solution that lasts.", icon: Shield },
  { value: "insurance_process" as BuyerPriority, label: "Insurance Process", detail: "Help navigating the claim process.", icon: FileText },
  { value: "repair_speed" as BuyerPriority, label: "Repair Speed", detail: "Addressed as quickly as possible.", icon: Zap },
  { value: "cost_clarity" as BuyerPriority, label: "Cost Clarity", detail: "Understand actual out-of-pocket costs.", icon: DollarSign },
  { value: "warranty_coverage" as BuyerPriority, label: "Warranty Coverage", detail: "Strong long-term protection.", icon: ShieldCheck },
  { value: "minimal_disruption" as BuyerPriority, label: "Minimal Disruption", detail: "Done with as little interruption.", icon: Waves },
];

const INSURER_OPTIONS: { value: InsurerContactStatus; label: string }[] = [
  { value: "not_yet", label: "Not yet — waiting for the inspection first" },
  { value: "already_contacted", label: "Yes — already contacted my insurer" },
  { value: "not_sure", label: "Not sure yet" },
];

export function A09BuyerPriorities({ session, onUpdate, onNext, onBack }: Props) {
  const [priorities, setPriorities] = useState<BuyerPriority[]>(session.buyerData.buyerPriorities);
  const [insurerStatus, setInsurerStatus] = useState<InsurerContactStatus | null>(session.buyerData.insurerContactStatus);
  const [anotherDM, setAnotherDM] = useState<boolean | null>(session.buyerData.anotherDecisionMakerPresent);
  const [dmName, setDmName] = useState(session.buyerData.decisionMakerName);
  const [dmEmail, setDmEmail] = useState(session.buyerData.decisionMakerEmail);
  const [questions, setQuestions] = useState(session.buyerData.buyerQuestions);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const togglePriority = (p: BuyerPriority) => {
    setPriorities((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
    setErrors((e) => { const n = { ...e }; delete n.priorities; return n; });
  };

  const handleSave = () => {
    const e: Record<string, string> = {};
    if (!priorities.length) e.priorities = "Please select at least one priority.";
    if (insurerStatus === null) e.insurer = "Please select your insurer contact status.";
    if (anotherDM === null) e.dm = "Please indicate whether another decision-maker is involved.";
    if (Object.keys(e).length) { setErrors(e); return; }

    const updated: SessionState = {
      ...session,
      buyerData: {
        ...session.buyerData,
        buyerPriorities: priorities,
        insurerContactStatus: insurerStatus,
        anotherDecisionMakerPresent: anotherDM,
        decisionMakerName: dmName,
        decisionMakerEmail: dmEmail,
        buyerQuestions: questions,
      },
    };
    onUpdate(updated);
    onNext();
  };

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606] selection:bg-indigo-500/30 selection:text-white">
      {/* Background Assets: Forensic Rapid Deployment Cloud */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Ambient Gradient Lift */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.08),transparent_70%)]" />

        {/* Forensic HUD Data Layer */}
        <motion.div 
          animate={{ opacity: [0.05, 0.1, 0.05], scale: [1, 1.05, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <img src="/images/forensic_hud.png" alt="" className="w-full h-full object-cover mix-blend-screen opacity-30 grayscale" />
        </motion.div>
      </div>

      {/* Background Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <ElegantShape
          delay={0.2}
          width={600}
          height={140}
          rotate={12}
          gradient="from-indigo-500/[0.12]"
          className="left-[-10%] top-[10%]"
        />
        <ElegantShape
          delay={0.4}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-rose-500/[0.12]"
          className="right-[-5%] top-[70%]"
        />
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
        <ProgressBar currentScreen="A09_buyer_priorities" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56">
        <div className="max-w-4xl mx-auto space-y-16">
          <SplineSceneBasic />

          {/* Priorities Section */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-medium text-white/80 uppercase tracking-wider">
                What matters most to you? <span className="text-indigo-400/60 lowercase">(select all that apply)</span>
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PRIORITIES.map((p, i) => {
                const isSelected = priorities.includes(p.value);
                return (
                  <motion.button
                    key={p.value}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => togglePriority(p.value)}
                    className={cn(
                      "group relative text-left p-6 rounded-[32px] border transition-all duration-500 overflow-hidden",
                      isSelected 
                        ? "bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.15)]" 
                        : "bg-white/[0.02] border-white/[0.05] hover:border-white/20"
                    )}
                  >
                    <div className="relative z-10 flex flex-col gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        isSelected ? "bg-indigo-500 text-white" : "bg-white/[0.05] text-white/40 group-hover:text-white/60"
                      )}>
                        <p.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className={cn(
                          "font-display font-medium text-lg transition-colors",
                          isSelected ? "text-white" : "text-white/60 group-hover:text-white/80"
                        )}>
                          {p.label}
                        </p>
                        <p className="text-xs text-white/30 font-light leading-snug mt-1 group-hover:text-white/40 transition-colors">
                          {p.detail}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <motion.div 
                        layoutId="active-check"
                        className="absolute top-4 right-4"
                      >
                        <Check className="w-5 h-5 text-indigo-400" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
            {errors.priorities && <p className="text-sm text-rose-500/80 pl-2">{errors.priorities}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Insurer Status */}
            <div className="space-y-6">
              <h2 className="text-lg font-display font-medium text-white/80 uppercase tracking-wider">
                Have you contacted your insurer yet?
              </h2>
              <div className="space-y-3">
                {INSURER_OPTIONS.map((opt) => {
                  const isSelected = insurerStatus === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { setInsurerStatus(opt.value); setErrors((e) => { const n = { ...e }; delete n.insurer; return n; }); }}
                      className={cn(
                        "w-full text-left px-6 py-4 rounded-2xl border transition-all duration-300",
                        isSelected 
                          ? "bg-white/10 border-white/20 text-white shadow-xl" 
                          : "bg-white/[0.02] border-white/[0.05] text-white/40 hover:bg-white/[0.04]"
                      )}
                    >
                      <span className="text-sm font-body">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              {errors.insurer && <p className="text-sm text-rose-500/80 pl-2">{errors.insurer}</p>}
            </div>

            {/* Decision Maker */}
            <div className="space-y-6">
              <h2 className="text-lg font-display font-medium text-white/80 uppercase tracking-wider">
                Another decision-maker involved?
              </h2>
              <div className="flex gap-3">
                {[{ val: false, label: "No, just me" }, { val: true, label: "Yes — not here today" }].map((opt) => {
                  const isSelected = anotherDM === opt.val;
                  return (
                    <button
                      key={String(opt.val)}
                      onClick={() => { setAnotherDM(opt.val); setErrors((e) => { const n = { ...e }; delete n.dm; return n; }); }}
                      className={cn(
                        "flex-1 px-6 py-4 rounded-2xl border transition-all duration-300 text-center",
                        isSelected 
                          ? "bg-white/10 border-white/20 text-white shadow-xl" 
                          : "bg-white/[0.02] border-white/[0.05] text-white/40 hover:bg-white/[0.04]"
                      )}
                    >
                      <span className="text-sm font-body">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              {errors.dm && <p className="text-sm text-rose-500/80 pl-2">{errors.dm}</p>}

              <AnimatePresence>
                {anotherDM && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3 pt-2"
                  >
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <UserPlus className="w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                      </div>
                      <input
                        className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 focus:border-indigo-500/50 outline-none transition-all"
                        placeholder="Their name (optional)"
                        value={dmName}
                        onChange={(e) => setDmName(e.target.value)}
                      />
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <FileText className="w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                      </div>
                      <input
                        className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 focus:border-indigo-500/50 outline-none transition-all"
                        placeholder="Their email — to receive a summary"
                        type="email"
                        value={dmEmail}
                        onChange={(e) => setDmEmail(e.target.value)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Questions Section */}
          <motion.div 
            whileFocus={{ scale: 1.01 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-display font-medium text-white/80 uppercase tracking-wider">
                Questions for the rep? <span className="text-white/20 lowercase">(optional)</span>
              </h2>
            </div>
            <textarea
              className="w-full bg-white/[0.02] border border-white/[0.1] rounded-[32px] p-8 text-white placeholder:text-white/10 focus:border-indigo-500/30 outline-none transition-all resize-none font-light leading-relaxed min-h-[160px]"
              placeholder="Anything specific you want the rep to address during the review..."
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
            />
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-8 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent pt-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <button onClick={onBack} className="group flex items-center gap-3 px-8 py-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300">
            <ArrowLeft className="w-4 h-4 text-white/40 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-white/60">Previous</span>
          </button>
          <StarButton 
            onClick={handleSave} 
            lightColor="#FAFAFA" 
            backgroundColor="#060606" 
            className="flex-1 max-w-md h-20 rounded-full shadow-[0_20px_60px_rgba(99,102,241,0.2)] active:scale-95 transition-all group"
          >
            <div className="flex items-center justify-center gap-4">
              <span className="text-xl font-display font-semibold tracking-tight">Save My Priorities</span>
              <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}
