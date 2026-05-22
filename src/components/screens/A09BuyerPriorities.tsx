"use client";

import { useState } from "react";
import type { SessionState, BuyerPriority, InsurerContactStatus } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
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
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";
import { useTheme } from "@/components/ThemeProvider";

function SplineSceneBasic() {
  const { theme } = useTheme();
  const isHighContrast = theme === "high-contrast";

  return (
    <Card className="w-full h-auto md:h-[500px] bg-[var(--bg-surface)] backdrop-blur-3xl relative overflow-hidden border border-[var(--border-color)] rounded-[48px] mb-12">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20 theme-graphic"
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-color)] mb-6 w-fit">
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-300 uppercase tracking-widest">Active Protection System</span>
            </div>
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[var(--tx1)] tracking-tight leading-[1.05]">
              What matters <br /> most to you?
            </h1>
            <p className="mt-6 text-[var(--tx3)] text-lg font-light max-w-md leading-relaxed">
              Tell us what matters most. Your rep will focus the live review on the concerns that matter to you.
            </p>
          </motion.div>
        </div>

        {/* Right content: Interactive 3D Robot with Protected Holographic Home */}
        <div className="flex-1 relative h-[500px] md:h-full min-h-[500px] md:min-h-[500px] group theme-graphic">
          <div className="absolute inset-0 z-0 overflow-hidden">
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
            className="absolute top-[55%] left-[12%] md:left-[11%] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
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
                  <span className="text-[10px] font-mono text-indigo-100 uppercase tracking-[0.3em] whitespace-nowrap">Property Fully Protected</span>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Interaction Hint */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center gap-3">
            <Shield className="w-3 h-3 text-indigo-400" />
            <span className="text-[9px] font-mono text-indigo-300 uppercase tracking-[0.2em]">Hustad is ready to help</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface Props {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
}

const PRIORITIES = [
  { value: "roof_longevity" as BuyerPriority, label: "Roof Longevity", detail: "Durable protection that lasts.", icon: Shield },
  { value: "insurance_process" as BuyerPriority, label: "Insurance Process", detail: "Understanding documentation, carrier review, and next steps.", icon: FileText },
  { value: "repair_speed" as BuyerPriority, label: "Repair Speed", detail: "Addressing urgent issues quickly.", icon: Zap },
  { value: "cost_clarity" as BuyerPriority, label: "Cost Clarity", detail: "Clear scope, clear options, clear next step.", icon: DollarSign },
  { value: "warranty_coverage" as BuyerPriority, label: "Warranty Coverage", detail: "Understanding what is covered and what is not.", icon: ShieldCheck },
  { value: "minimal_disruption" as BuyerPriority, label: "Minimal Disruption", detail: "Clean work and clear communication.", icon: Waves },
];

type InsurerStatusLocal = "not_yet" | "already_contacted" | "questions_before" | "not_sure";

const INSURER_OPTIONS: { value: InsurerStatusLocal; label: string }[] = [
  { value: "not_yet", label: "No, waiting for the inspection first" },
  { value: "already_contacted", label: "Yes, claim already opened" },
  { value: "questions_before", label: "I have questions before contacting them" },
  { value: "not_sure", label: "Not sure yet" },
];

const DM_OPTIONS = [
  { val: "just_me", label: "No, just me", anotherPresent: false, relation: "" },
  { val: "spouse_or_co_owner", label: "Yes, spouse or co-owner", anotherPresent: true, relation: "spouse_or_co_owner" },
  { val: "property_manager_or_hoa", label: "Yes, property manager or HOA", anotherPresent: true, relation: "property_manager_or_hoa" },
  { val: "not_present", label: "Yes, not present today", anotherPresent: true, relation: "not_present" },
];

export function A09BuyerPriorities({ session, onUpdate, onNext, onBack }: Props) {
  const { theme } = useTheme();
  const isHighContrast = theme === "high-contrast";

  const [priorities, setPriorities] = useState<BuyerPriority[]>(session.buyerData.buyerPriorities);
  const [insurerStatus, setInsurerStatus] = useState<InsurerStatusLocal | null>(
    session.buyerData.insurerContactStatus as InsurerStatusLocal | null
  );
  
  const getInitialDMVal = () => {
    if (session.buyerData.anotherDecisionMakerPresent === false) return "just_me";
    if (session.buyerData.anotherDecisionMakerPresent === true) {
      const rel = session.buyerData.decisionMakerRelation;
      if (rel === "spouse_or_co_owner" || rel === "property_manager_or_hoa" || rel === "not_present") {
        return rel;
      }
      return "spouse_or_co_owner"; // default fallback
    }
    return null;
  };
  const [dmVal, setDmVal] = useState<string | null>(getInitialDMVal());
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
    if (dmVal === null) e.dm = "Please indicate whether another decision-maker is involved.";
    if (Object.keys(e).length) { setErrors(e); return; }

    const selectedDMOption = DM_OPTIONS.find(o => o.val === dmVal);
    const anotherPresentValue = selectedDMOption ? selectedDMOption.anotherPresent : null;
    const relationValue = selectedDMOption ? selectedDMOption.relation : "";

    const updated: SessionState = {
      ...session,
      buyerData: {
        ...session.buyerData,
        buyerPriorities: priorities,
        insurerContactStatus: insurerStatus === "questions_before" ? "not_sure" : insurerStatus,
        anotherDecisionMakerPresent: anotherPresentValue,
        decisionMakerRelation: relationValue,
        decisionMakerName: anotherPresentValue ? dmName : "",
        decisionMakerEmail: anotherPresentValue ? dmEmail : "",
        buyerQuestions: questions,
      },
    };
    onUpdate(updated);
    onNext();
  };

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[var(--bg-base)] text-[var(--tx1)] selection:bg-indigo-500/30 selection:text-[var(--tx1)]">
      {/* Background Assets: Rapid Deployment Cloud */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden theme-graphic">
        {/* Ambient Gradient Lift */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.08),transparent_70%)]" />

        {/* HUD Data Layer */}
        <motion.div 
          animate={{ opacity: [0.05, 0.1, 0.05], scale: [1, 1.05, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <img src="/images/forensic_hud.png" alt="" className="w-full h-full object-cover mix-blend-screen opacity-30 grayscale" />
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
        <ProgressBar currentScreen="A09_buyer_priorities" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56 min-h-0">
        <div className="max-w-4xl mx-auto space-y-16">
          <SplineSceneBasic />

          {/* Priorities Section */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-medium text-[var(--tx2)] uppercase tracking-wider">
                What matters most to you? <span className="text-indigo-500 dark:text-indigo-400 lowercase">(select all that apply)</span>
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
                        ? (isHighContrast ? "bg-black text-white border-2 border-black" : "bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.15)]")
                        : "bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-indigo-500/20"
                    )}
                  >
                    <div className="relative z-10 flex flex-col gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        isSelected 
                          ? (isHighContrast ? "bg-white text-black" : "bg-indigo-500 text-white") 
                          : "bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx3)] group-hover:text-[var(--tx1)]"
                      )}>
                        <p.icon className={cn("w-5 h-5", isSelected && isHighContrast ? "text-black" : "")} />
                      </div>
                      <div>
                        <p className={cn(
                          "font-display font-medium text-lg transition-colors",
                          isSelected 
                            ? (isHighContrast ? "text-white" : "text-[var(--tx1)]") 
                            : "text-[var(--tx2)] group-hover:text-[var(--tx1)]"
                        )}>
                          {p.label}
                        </p>
                        <p className={cn(
                          "text-xs font-light leading-snug mt-1 transition-colors",
                          isSelected
                            ? (isHighContrast ? "text-white/90" : "text-[var(--tx3)]")
                            : "text-[var(--tx3)]"
                        )}>
                          {p.detail}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <motion.div 
                        layoutId="active-check"
                        className="absolute top-4 right-4"
                      >
                        <Check className={cn("w-5 h-5", isHighContrast ? "text-white" : "text-indigo-500 dark:text-indigo-400")} />
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
              <h2 className="text-lg font-display font-medium text-[var(--tx2)] uppercase tracking-wider">
                Have you contacted your insurance carrier yet?
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
                          ? (isHighContrast ? "bg-black text-white border-2 border-black" : "bg-[var(--bg-subtle)] border-2 border-indigo-500 text-[var(--tx1)] shadow-xl") 
                          : "bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--tx3)] hover:bg-[var(--bg-subtle)]"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-body",
                        isSelected && isHighContrast ? "text-white" : ""
                      )}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              {errors.insurer && <p className="text-sm text-rose-500/80 pl-2">{errors.insurer}</p>}
            </div>

            {/* Decision Maker */}
            <div className="space-y-6">
              <h2 className="text-lg font-display font-medium text-[var(--tx2)] uppercase tracking-wider">
                Is another decision-maker involved?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DM_OPTIONS.map((opt) => {
                  const isSelected = dmVal === opt.val;
                  return (
                    <button
                      key={opt.val}
                      onClick={() => { 
                        setDmVal(opt.val); 
                        setErrors((e) => { const n = { ...e }; delete n.dm; return n; }); 
                      }}
                      className={cn(
                        "w-full px-4 py-4 rounded-2xl border transition-all duration-300 text-center flex items-center justify-center min-h-[58px]",
                        isSelected 
                          ? (isHighContrast ? "bg-black text-white border-2 border-black" : "bg-[var(--bg-subtle)] border-2 border-indigo-500 text-[var(--tx1)] shadow-xl") 
                          : "bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--tx3)] hover:bg-[var(--bg-subtle)]"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-body leading-tight",
                        isSelected && isHighContrast ? "text-white" : ""
                      )}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              {errors.dm && <p className="text-sm text-rose-500/80 pl-2">{errors.dm}</p>}

              <AnimatePresence>
                {dmVal !== "just_me" && dmVal !== null && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3 pt-2"
                  >
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <UserPlus className="w-4 h-4 text-[var(--tx3)] transition-colors" />
                      </div>
                      <input
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl py-3 pl-12 pr-4 text-[var(--tx1)] placeholder-[var(--tx4)] focus:border-indigo-500 outline-none transition-all"
                        placeholder="Their name (optional)"
                        value={dmName}
                        onChange={(e) => setDmName(e.target.value)}
                      />
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <FileText className="w-4 h-4 text-[var(--tx3)] transition-colors" />
                      </div>
                      <input
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl py-3 pl-12 pr-4 text-[var(--tx1)] placeholder-[var(--tx4)] focus:border-indigo-500 outline-none transition-all"
                        placeholder="Their email, to receive a summary"
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
              <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-lg font-display font-medium text-[var(--tx2)] uppercase tracking-wider">
                Questions for the rep? <span className="text-[var(--tx3)] lowercase">(optional)</span>
              </h2>
            </div>
            <textarea
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[32px] p-8 text-[var(--tx1)] placeholder-[var(--tx4)] focus:border-indigo-500 outline-none transition-all resize-none font-light leading-relaxed min-h-[160px]"
              placeholder="Anything specific you want the rep to address during the review..."
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
            />
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
            onClick={handleSave} 
            lightColor={isHighContrast ? "#000000" : "#FAFAFA"} 
            backgroundColor={isHighContrast ? "#000000" : "#060606"} 
            className={`flex-1 h-14 md:h-20 rounded-full active:scale-95 transition-all group btn-primary ${
              isHighContrast 
                ? "bg-black text-white border-2 border-white" 
                : "text-white shadow-[0_20px_60px_rgba(99,102,241,0.2)]"
            }`}
          >
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">Save My Priorities</span>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}
