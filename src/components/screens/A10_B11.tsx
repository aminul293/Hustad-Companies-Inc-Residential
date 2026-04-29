"use client";

import { useState, useEffect } from "react";
import type { SessionState, OutcomeType } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ElegantShape } from "@/components/ui/shape-landing-hero";
import { StarButton } from "@/components/ui/star-button";
import { SplineScene } from "@/components/ui/splite";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  Camera, 
  Lock, 
  Check, 
  LayoutGrid, 
  Plus, 
  Minus,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  Clock,
  ShieldCheck,
  Zap,
  Eye,
  Trash2,
  FileText,
  Upload,
  Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";
import { lockSummary, setOutcomeType } from "@/lib/session";

// ─────────────────────────────────────────────────────────────────────────────
// A10 – Inspection In Progress Hold Screen
// ─────────────────────────────────────────────────────────────────────────────

interface HoldProps {
  session: SessionState;
  onRepReturn: () => void;
}

export function A10InspectionHold({ session, onRepReturn }: HoldProps) {
  const [showRepReturn, setShowRepReturn] = useState(false);
  const [wakeCount, setWakeCount] = useState(0);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setWakeCount((c) => c + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606]">
      {/* Background Assets: Forensic Rapid Deployment Cloud */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Ambient Gradient Lift */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.04),transparent_70%)]" />

        {/* Forensic HUD Data Layer */}
        <motion.div 
          animate={{ opacity: [0.03, 0.06, 0.03], scale: [1, 1.02, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <img src="/images/forensic_hud.png" alt="" className="w-full h-full object-cover mix-blend-screen opacity-20 grayscale" />
        </motion.div>

        {/* Roofing Blueprint - Ultra Subtle */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.05, scale: 0.9, y: [0, -10, 0] }}
          transition={{ duration: 2, y: { duration: 15, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[10%] -left-32 w-[500px] h-[500px]"
        >
          <img src="/images/roofing_blueprint.png" alt="" className="w-full h-full object-contain mix-blend-screen grayscale" />
        </motion.div>

        {/* Forensic Inspection Drone - Far Top Right */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.5, x: 200 }}
          animate={{ opacity: 0.08, scale: 0.7, x: 0, y: [0, -15, 0] }}
          transition={{ duration: 2, y: { duration: 12, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[2%] -right-48 w-[400px] h-[400px]"
        >
          <img src="/images/inspection_drone.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-70" />
        </motion.div>
      </div>

      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-white text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-white/70 uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="max-w-4xl w-full space-y-12">
          {/* Central High-Impact Visual */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full h-[350px] rounded-[48px] overflow-hidden bg-white/[0.04] border border-white/20 backdrop-blur-3xl group"
          >
            <div className="absolute inset-0 z-0">
              <SplineScene 
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="w-full h-full opacity-60"
              />
            </div>
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-4 pointer-events-none">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border border-indigo-500/30 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-indigo-400 animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full border border-indigo-400/20 animate-ping" />
              </div>
              <p className="font-mono text-[10px] text-indigo-300 uppercase tracking-[0.4em]">Inspection Active</p>
            </div>
          </motion.div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-display font-medium text-white tracking-tighter leading-[1.1]">
              The rep is finishing
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">the exterior review.</span>
            </h1>
            <p className="text-lg text-white/50 font-light leading-relaxed max-w-lg mx-auto">
              They will return with documented findings, one recommendation,
              and the correct next step.
            </p>
          </div>

          {/* Priorities Recap */}
          {session.buyerData.buyerPriorities.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex flex-col items-center gap-4 bg-white/[0.05] border border-white/10 rounded-3xl p-6 backdrop-blur-xl"
            >
              <p className="font-mono text-[10px] text-white/70 uppercase tracking-[0.3em]">Your Focus Areas</p>
              <div className="flex flex-wrap justify-center gap-2">
                {session.buyerData.buyerPriorities.map((p) => (
                  <span key={p} className="px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-xs font-mono capitalize">
                    {p.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="relative z-30 p-8 pt-0">
        <div className="max-w-md mx-auto w-full">
          {!showRepReturn ? (
            <button
              onClick={() => setShowRepReturn(true)}
              className="w-full py-5 rounded-3xl bg-white/10 border border-white/20 text-white font-display text-sm hover:bg-white/20 transition-all active:scale-[0.98]"
            >
              I am ready for the review
            </button>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-center gap-3">
                <Clock className="w-4 h-4 text-amber-400" />
                <p className="text-[10px] font-mono text-amber-400/60 uppercase tracking-widest pt-0.5">
                  Rep Takeover Required
                </p>
              </div>
              <StarButton 
                onClick={onRepReturn}
                lightColor="#FAFAFA"
                backgroundColor="#060606"
                className="w-full h-18 rounded-3xl active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg font-display font-medium">Begin Findings Review</span>
                  <ChevronRight className="w-5 h-5" />
                </div>
              </StarButton>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// B11 – Rep Findings Prep & Summary Lock
// ─────────────────────────────────────────────────────────────────────────────

interface RepPrepProps {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
}

const OUTCOME_OPTIONS: { value: OutcomeType; label: string; description: string; icon: any }[] = [
  { value: "no_damage", label: "No Damage", description: "No meaningful storm damage was documented.", icon: ShieldCheck },
  { value: "monitor_only", label: "Monitor Only", description: "Conditions present but no actionable project today.", icon: Eye },
  { value: "repair_only", label: "Repair Only", description: "Specific repair items identified. No replacement.", icon: Wrench },
  { value: "claim_review_candidate", label: "Claim Review", description: "Storm-related damage documented. Viable path.", icon: Zap },
  { value: "full_restoration_candidate", label: "Full Restoration", description: "Scope supports full restoration project.", icon: LayoutGrid },
];

export function B11RepFindingsPrep({ session, onUpdate, onNext }: RepPrepProps) {
  const f = session.findings;
  const [outcomeType, setOutcome] = useState<OutcomeType | null>(f.outcomeType);
  const [urgentCount, setUrgentCount] = useState(f.urgentItemsCount);
  const [stormCount, setStormCount] = useState(f.stormRelatedItemsCount);
  const [monitorCount, setMonitorCount] = useState(f.monitorItemsCount);
  const [headline, setHeadline] = useState(f.summaryHeadline);
  const [body, setBody] = useState(f.summaryBody);
  const [internalNotes, setInternalNotes] = useState(f.internalNotes);
  const [urgentRecommended, setUrgentRecommended] = useState(f.urgentProtectionRecommended);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!outcomeType) e.outcome = "Select an outcome type.";
    if (!headline.trim()) e.headline = "Headline required.";
    if (!body.trim()) e.body = "Body required.";
    return e;
  };

  const handleLock = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    let updated: SessionState = {
      ...session,
      mode: "rep",
      findings: {
        ...session.findings,
        outcomeType: outcomeType!,
        urgentItemsCount: urgentCount,
        stormRelatedItemsCount: stormCount,
        monitorItemsCount: monitorCount,
        summaryHeadline: headline,
        summaryBody: body,
        internalNotes,
        urgentProtectionRecommended: urgentRecommended,
      },
    };
    updated = setOutcomeType(updated, outcomeType!);
    updated = lockSummary(updated);
    onUpdate(updated);
    onNext();
  };

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

      {/* Rep Mode Header */}
      <div className="relative z-30 flex items-center justify-between px-10 pt-10 pb-6 border-b border-white/[0.1] bg-[#060606]/90 backdrop-blur-xl">
        <div className="flex flex-col items-start">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display font-bold text-white text-2xl tracking-[0.1em]">HUSTAD</span>
            <span className="text-[10px] font-mono text-white/70 uppercase tracking-[0.3em]">Rep Control</span>
          </div>
          <p className="text-[10px] font-mono text-white/90 mt-1 uppercase tracking-widest">Findings Preparation — S11</p>
        </div>
        <div className="flex items-center gap-3 px-5 py-2 rounded-2xl bg-amber-500/20 border border-amber-500/40">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <span className="text-xs font-mono text-amber-400 font-medium uppercase tracking-widest">Internal View Only</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-10 pt-8 pb-40">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-10">
            {/* Outcome Selection */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-white/90" />
                <h2 className="text-sm font-display font-medium text-white/80 uppercase tracking-[0.2em]">Final Recommendation</h2>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {OUTCOME_OPTIONS.map((opt) => {
                  const isSelected = outcomeType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { setOutcome(opt.value); setErrors((e) => { const n = { ...e }; delete n.outcome; return n; }); }}
                      className={cn(
                        "group flex items-start gap-5 p-5 rounded-3xl border transition-all duration-300 text-left",
                        isSelected 
                          ? "bg-indigo-500/20 border-indigo-500/50 shadow-2xl" 
                          : "bg-white/[0.04] border-white/[0.1] hover:border-white/30"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                        isSelected ? "bg-indigo-500 text-white" : "bg-white/[0.1] text-white/50 group-hover:text-white/70"
                      )}>
                        <opt.icon className="w-6 h-6" />
                      </div>
                      <div className="pt-1">
                        <p className={cn(
                          "font-display font-medium text-lg transition-colors",
                          isSelected ? "text-white" : "text-white/80 group-hover:text-white"
                        )}>
                          {opt.label}
                        </p>
                        <p className={cn(
                          "text-sm font-light leading-relaxed transition-colors",
                          isSelected ? "text-indigo-200/70" : "text-white/50 group-hover:text-white/90"
                        )}>
                          {opt.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {errors.outcome && <p className="text-sm text-rose-400 pl-2">{errors.outcome}</p>}
            </section>

            {/* Counts Section */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <LayoutGrid className="w-4 h-4 text-white/90" />
                <h2 className="text-sm font-display font-medium text-white/80 uppercase tracking-[0.2em]">Quantified Findings</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Urgent", value: urgentCount, set: setUrgentCount, color: "text-rose-400" },
                  { label: "Storm", value: stormCount, set: setStormCount, color: "text-indigo-400" },
                  { label: "Monitor", value: monitorCount, set: setMonitorCount, color: "text-white/80" },
                ].map((item) => (
                  <div key={item.label} className="bg-white/[0.04] border border-white/[0.1] rounded-[32px] p-6 text-center group hover:bg-white/[0.08] transition-colors">
                    <p className={cn("text-4xl font-display font-medium mb-1", item.color)}>{item.value}</p>
                    <p className="text-[10px] font-mono text-white/70 uppercase tracking-[0.2em] mb-4">{item.label}</p>
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => item.set(Math.max(0, item.value - 1))}
                        className="w-10 h-10 rounded-xl bg-white/[0.1] hover:bg-white/[0.2] text-white/90 flex items-center justify-center transition-all active:scale-90"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => item.set(item.value + 1)}
                        className="w-10 h-10 rounded-xl bg-white/[0.1] hover:bg-white/[0.2] text-white/90 flex items-center justify-center transition-all active:scale-90"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:col-span-5 space-y-10">
            {/* Summary Texts */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-white/90" />
                <h2 className="text-sm font-display font-medium text-white/80 uppercase tracking-[0.2em]">Buyer Summary</h2>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-white/70 uppercase tracking-widest pl-2">Headline</p>
                  <input
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 px-6 text-white placeholder:text-white/60 outline-none focus:border-indigo-500/50 transition-all"
                    placeholder="Documented hail impact to North-East slopes..."
                    value={headline}
                    onChange={(e) => { setHeadline(e.target.value); setErrors((err) => { const n = { ...err }; delete n.headline; return n; }); }}
                  />
                  {errors.headline && <p className="text-sm text-rose-400 pl-2">{errors.headline}</p>}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-white/70 uppercase tracking-widest pl-2">Body Detail</p>
                  <textarea
                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-3xl p-6 text-white placeholder:text-white/60 outline-none focus:border-indigo-500/50 transition-all resize-none font-light leading-relaxed min-h-[140px]"
                    placeholder="We documented specific evidence of..."
                    value={body}
                    onChange={(e) => { setBody(e.target.value); setErrors((err) => { const n = { ...err }; delete n.body; return n; }); }}
                  />
                  {errors.body && <p className="text-sm text-rose-400 pl-2">{errors.body}</p>}
                </div>
              </div>
            </section>

            {/* Photo Assets */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Camera className="w-4 h-4 text-white/90" />
                  <h2 className="text-sm font-display font-medium text-white/80 uppercase tracking-[0.2em]">Documentation</h2>
                </div>
                <span className="text-[10px] font-mono text-white/70">{session.photoAssets.length} Assets</span>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {session.photoAssets.map((photo) => (
                  <div key={photo.assetId} className="group relative aspect-square rounded-2xl overflow-hidden border border-white/20 bg-white/[0.04]">
                    <img src={photo.dataUrl} alt="Finding" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <button 
                      onClick={() => onUpdate({ ...session, photoAssets: session.photoAssets.filter(p => p.assetId !== photo.assetId) })}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 backdrop-blur-md text-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                      <p className="text-[8px] font-mono text-white/80 truncate uppercase">{photo.category}</p>
                    </div>
                  </div>
                ))}
                <label className="aspect-square rounded-2xl border border-dashed border-white/30 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group">
                  <Upload className="w-5 h-5 text-white/70 group-hover:text-indigo-400 transition-colors" />
                  <span className="text-[10px] font-mono text-white/70 uppercase tracking-widest">Add Asset</span>
                  <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => {/* Handle upload logic */}} />
                </label>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Lock Footer */}
      <div className="absolute bottom-0 inset-x-0 p-8 z-40 bg-gradient-to-t from-[#060606] via-[#060606] to-transparent pt-20 pointer-events-none">
        <div className="max-w-5xl mx-auto flex flex-col items-center pointer-events-auto">
          <StarButton 
            onClick={handleLock}
            disabled={!outcomeType}
            lightColor="#FAFAFA"
            backgroundColor="#060606"
            className={cn(
              "w-full h-20 rounded-[32px] transition-all",
              !outcomeType ? "opacity-30 grayscale cursor-not-allowed" : "active:scale-95"
            )}
          >
            <div className="flex items-center gap-5">
              {Object.keys(errors).length > 0 ? (
                <AlertCircle className="w-6 h-6 text-rose-500" />
              ) : (
                <Lock className="w-6 h-6 text-white/90" />
              )}
              <span className="text-xl font-display font-medium text-white">
                {!outcomeType ? "Select Outcome to Continue" : "Lock Summary & Begin Review"}
              </span>
              <ChevronRight className="w-6 h-6 text-white/90" />
            </div>
          </StarButton>
          
          <div className="flex items-center justify-center gap-3 mt-4">
            {!outcomeType ? (
              <p className="text-[10px] font-mono text-white/50 uppercase tracking-[0.2em]">Select one of the 5 outcomes above</p>
            ) : Object.keys(errors).length > 0 ? (
              <p className="text-[10px] font-mono text-rose-500 uppercase tracking-[0.2em] animate-pulse">Required fields missing: {Object.keys(errors).join(", ")}</p>
            ) : (
              <>
                <ShieldCheck className="w-3 h-3 text-white/70" />
                <p className="text-[10px] font-mono text-white/70 uppercase tracking-[0.2em]">Immutable Record Once Locked</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
