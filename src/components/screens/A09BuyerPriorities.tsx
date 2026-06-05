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
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import type { DecisionComfortOption } from "@/types/session";


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
  { value: "not_yet", label: "No, waiting for inspection findings first" },
  { value: "already_contacted", label: "Yes, a claim has already been opened" },
  { value: "questions_before", label: "I have questions before contacting them" },
  { value: "not_sure", label: "Not sure yet" },
];

const DM_OPTIONS = [
  { val: "just_me", label: "No, just me", anotherPresent: false, relation: "" },
  { val: "spouse_or_co_owner", label: "Yes, spouse or co-owner", anotherPresent: true, relation: "spouse_or_co_owner" },
  { val: "property_manager_or_hoa", label: "Yes, property manager or HOA", anotherPresent: true, relation: "property_manager_or_hoa" },
  { val: "not_present", label: "Yes, another decision-maker not here today", anotherPresent: true, relation: "not_present" },
];



const COMFORT_OPTIONS: { value: DecisionComfortOption; label: string }[] = [
  { value: "clear_photos", label: "Seeing clear photos of the condition" },
  { value: "urgent_vs_monitor", label: "Understanding whether this is urgent or monitor-only" },
  { value: "insurance_boundaries", label: "Knowing what insurance does and does not decide" },
  { value: "cost_options", label: "Understanding cost or scope options" },
  { value: "warranty_coverage", label: "Reviewing warranty coverage" },
  { value: "spouse_involvement", label: "Involving a spouse or co-owner" },
  { value: "timeline", label: "Knowing how soon work could be completed" },
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
  const [decisionComfort, setDecisionComfort] = useState<DecisionComfortOption | null>(session.buyerData.decisionComfort || null);
  const [questions, setQuestions] = useState(session.buyerData.buyerQuestions);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const togglePriority = (p: BuyerPriority) => {
    setPriorities((prev) => {
      if (prev.includes(p)) return prev.filter((x) => x !== p);
      if (prev.length >= 3) return prev;
      return [...prev, p];
    });
    setErrors((e) => { const n = { ...e }; delete n.priorities; return n; });
  };

  const handleSave = () => {
    const e: Record<string, string> = {};
    if (!priorities.length) e.priorities = "Please select at least one priority.";
    if (insurerStatus === null) e.insurer = "Please select your insurance status.";
    if (dmVal === null) e.dm = "Please indicate decision-maker status.";
    if (decisionComfort === null) e.comfort = "Please let us know what would help you feel comfortable.";
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
        decisionComfort,
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

      </div>

      {/* Persistent Branding Anchor */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none text-[var(--tx1)]">
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

      <div className="relative z-20 flex-shrink-0 pt-6">
        <ProgressBar currentScreen="A09_buyer_priorities" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56 min-h-0">
        <div className="max-w-4xl mx-auto space-y-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-color)] w-fit">
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-300 uppercase tracking-widest">Your priorities</span>
            </div>
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[var(--tx1)] tracking-tight leading-[1.05]">
              What matters most today?
            </h1>
            <p className="text-xl text-[var(--tx3)] font-light max-w-2xl leading-relaxed">
              Tell us what to focus on. Your rep will open the live review with your selected priorities and actual photos from your home.
            </p>
          </motion.div>

          {/* Priorities Section */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-medium text-[var(--tx2)] uppercase tracking-wider">
                Select up to 3 priorities.
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

          {/* Decision Comfort Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-display font-medium text-[var(--tx2)] uppercase tracking-wider">
              What would help you feel comfortable with the next step today?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COMFORT_OPTIONS.map((opt) => {
                const isSelected = decisionComfort === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => { 
                      setDecisionComfort(opt.value); 
                      setErrors((e) => { const n = { ...e }; delete n.comfort; return n; }); 
                    }}
                    className={cn(
                      "w-full px-4 py-4 rounded-2xl border transition-all duration-300 text-center flex items-center justify-center min-h-[58px]",
                      isSelected 
                        ? (isHighContrast ? "bg-black text-white border-2 border-black" : "bg-indigo-500/10 border-2 border-indigo-500 text-[var(--tx1)] shadow-xl") 
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
            {errors.comfort && <p className="text-sm text-rose-500/80 pl-2">{errors.comfort}</p>}
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
