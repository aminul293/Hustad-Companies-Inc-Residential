"use client";

import { useState, useEffect } from "react";
import type { SessionState, SelectedPath } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StarButton } from "@/components/ui/star-button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Zap,
  Eye,
  Wrench,
  FileText,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Unlock,
  CheckCircle2,
  Camera,
  MapPin,
  Clock,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { setSelectedPath, addAuditEvent, unlockSummary } from "@/lib/session";
import { PhotoThumbnail } from "@/components/PhotoThumbnail";

interface Props {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
  onRepJump?: (screen: import("@/types/session").ScreenId) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// B12 – Findings Summary
// ─────────────────────────────────────────────────────────────────────────────

const OUTCOME_HEADLINE: Record<string, string> = {
  no_damage: "No damage documented.",
  monitor_only: "Conditions flagged for monitoring.",
  repair_only: "Repairs documented. No claim path indicated.",
  claim_review_candidate: "Storm damage documented. Carrier review indicated.",
  full_restoration_candidate: "Significant damage documented. Full restoration indicated.",
};

export function B12FindingsSummary({ session, onUpdate, onNext, onBack, onRepJump }: Props) {
  const { findings } = session;
  const outcome = findings.outcomeType!;
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const summaryPhotos = [
    ...(session.photoAssets || []).filter((p) => p.selectedForSummary).map(p => ({ id: p.assetId, url: p.dataUrl, date: p.createdAt, type: "legacy" as const })),
    ...(session.photos || []).filter((p) => p.selectedForSummary).map(p => ({ id: p.id, date: p.createdAt, type: "structured" as const, photo: p }))
  ];

  const handleUnlock = () => {
    const updated = unlockSummary(session);
    onUpdate(updated);
    if (onRepJump) onRepJump("B11_rep_findings_prep");
  };

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606]">
      {/* Background Assets: Forensic Rapid Deployment Cloud */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Ambient Gradient Lift */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.04),transparent_70%)]" />

        {/* National Mobilization Map - Ultra Subtle Accountability */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.05, scale: 0.85, y: [0, -15, 0] }}
          transition={{ duration: 2, y: { duration: 20, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[10%] -left-32 w-[550px] h-[550px]"
        >
          <img src="/images/mobilization_map.png" alt="" className="w-full h-full object-contain mix-blend-screen grayscale" />
        </motion.div>

      </div>

      <div className="absolute top-10 left-10 z-30 hidden lg:flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-[#E8EDF8] text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="B12_findings_summary" phase="B" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-10 pt-12 pb-56 min-h-0">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Header & Status */}
          <div className="flex items-end justify-between border-b border-white/[0.05] pb-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md w-fit">
                <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest pt-0.5">Summary Locked & Audited</span>
              </div>
              <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[#E8EDF8] tracking-tight leading-[1.05]">
                {OUTCOME_HEADLINE[outcome] || findings.summaryHeadline || "Reviewing your findings."}
              </h1>
            </motion.div>
            
            {session.mode === "rep" && (
              <button 
                onClick={() => setShowUnlockConfirm(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-[#AABDCF] hover:text-amber-400 hover:border-amber-500/30 transition-all group active:scale-95 mb-1"
              >
                <Unlock className="w-4 h-4" />
                <span className="text-xs font-mono uppercase tracking-widest">Unlock for Edit</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-10">
              {/* Outcome Highlight */}
              <div className="relative p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.1] backdrop-blur-3xl overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Shield className="w-32 h-32 text-indigo-500" />
                </div>
                <div className="relative z-10 space-y-6">
                  <p className="font-mono text-[10px] text-[#AABDCF] uppercase tracking-[0.3em]">Official Recommendation</p>
                  <div className="space-y-2">
                    <p className="text-3xl font-display font-medium text-[#E8EDF8] tracking-tight capitalize">
                      {outcome.replace(/_/g, " ")}
                    </p>
                    <p className="text-lg text-[#DDE5F5] font-light leading-relaxed max-w-md">
                      {findings.summaryBody}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quantified Stats Bento */}
              <div className="grid grid-cols-3 gap-6">
                {[
                  { label: "Urgent", value: findings.urgentItemsCount, icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-500/10" },
                  { label: "Storm", value: findings.stormRelatedItemsCount, icon: Zap, color: "text-indigo-400", bg: "bg-indigo-500/10" },
                  { label: "Monitor", value: findings.monitorItemsCount, icon: Eye, color: "text-[#C2D0E4]", bg: "bg-white/10" },
                ].map((item) => (
                  <div key={item.label} className="bg-white/[0.02] border border-white/[0.05] rounded-[32px] p-8 text-center group hover:bg-white/[0.05] transition-all">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-4", item.bg)}>
                      <item.icon className={cn("w-5 h-5", item.color)} />
                    </div>
                    <p className={cn("text-4xl font-display font-medium mb-1", item.color)}>{item.value}</p>
                    <p className="text-[10px] font-mono text-[#7090B0] uppercase tracking-[0.2em]">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Credibility Block */}
              <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/[0.05] space-y-4">
                <p className="text-[10px] font-mono text-[#7090B0] uppercase tracking-[0.2em]">What we are not saying</p>
                <div className="space-y-3">
                  {[
                    "We are not guaranteeing insurance coverage or claim approval.",
                    "We are not recommending a path that is not supported by what we documented today.",
                    "We are not pressuring a decision — the documented findings belong to you regardless of next steps.",
                  ].map((line, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1 h-1 rounded-full bg-[#AABDCF]/40 mt-2 shrink-0" />
                      <p className="text-sm text-[#AABDCF] font-light leading-relaxed">{line}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-10">
              {/* Homeowner Priorities Panel */}
              {session.buyerData.buyerPriorities && session.buyerData.buyerPriorities.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-[#AABDCF]" />
                    <h2 className="text-sm font-display font-medium text-[#DDE5F5] uppercase tracking-[0.2em]">Your Stated Priorities</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {session.buyerData.buyerPriorities.map((p) => (
                      <span key={p} className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-[#E8EDF8] text-sm font-display shadow-sm backdrop-blur-md">
                        {p.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Photo Documentation Grid */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Camera className="w-4 h-4 text-[#AABDCF]" />
                    <h2 className="text-sm font-display font-medium text-[#DDE5F5] uppercase tracking-[0.2em]">Documentation</h2>
                  </div>
                  <span className="text-[10px] font-mono text-[#AABDCF]">{summaryPhotos.length} Findings</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {summaryPhotos.length > 0 ? summaryPhotos.slice(0, 6).map((photo) => (
                    <div key={photo.id} className="group relative aspect-[4/3] rounded-3xl overflow-hidden border border-white/10 bg-white/[0.02]">
                      {photo.type === "structured" ? (
                        <PhotoThumbnail photo={photo.photo!} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <img src={(photo as any).url} alt="Documentation" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <p className="text-[8px] font-mono text-[#E8EDF8] uppercase tracking-widest">Captured • {new Date(photo.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )) : [1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="aspect-[4/3] rounded-3xl border border-dashed border-white/10 bg-white/[0.01] flex items-center justify-center">
                      <Camera className="w-6 h-6 text-[#1F2E48]" />
                    </div>
                  ))}
                </div>
              </section>

              {/* Property Anchor */}
              <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/[0.05] space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <p className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-[0.2em]">Property Anchor</p>
                </div>
                <div>
                  <p className="text-lg font-display font-medium text-[#E8EDF8]">{session.property.address}</p>
                  <p className="text-sm text-[#AABDCF] font-light mt-1">{session.property.homeownerPrimaryName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          <button onClick={onBack} className="group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 shrink-0">
            <ArrowLeft className="w-4 h-4 text-[#DDE5F5] group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-[#E8EDF8]">Previous</span>
          </button>
          <StarButton 
            onClick={onNext} 
            lightColor="#FAFAFA" 
            backgroundColor="#060606" 
            className="flex-1 h-14 md:h-20 rounded-full shadow-[0_20px_60px_rgba(99,102,241,0.2)] active:scale-95 transition-all group"
          >
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">Show Recommended Path</span>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </StarButton>
        </div>
      </div>

      {/* Unlock Confirmation Modal */}
      <AnimatePresence>
        {showUnlockConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-8"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full bg-[#0a0a0a] border border-white/10 rounded-[40px] p-10 space-y-8 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Unlock className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-2xl font-display font-medium text-[#E8EDF8]">Unlock findings summary?</h2>
                <p className="text-[#AABDCF] font-light leading-relaxed">
                  This will return you to findings prep. The buyer-facing summary will be editable again. <br/><span className="text-amber-500/60 text-xs font-mono uppercase tracking-widest">Security Log Entry Required</span>
                </p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowUnlockConfirm(false)} className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-[#DDE5F5] font-display font-medium hover:bg-white/10 transition-all">Cancel</button>
                <button onClick={handleUnlock} className="flex-1 py-4 rounded-2xl bg-amber-500 text-black font-display font-bold hover:bg-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]">Unlock & Edit</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// B13 – Recommended Path
// ─────────────────────────────────────────────────────────────────────────────

export function B13RecommendedPath({ session, onUpdate, onNext, onBack }: Props) {
  const outcome = session.findings.outcomeType || "no_damage";
  const config = PATH_CONFIG[outcome] || PATH_CONFIG.no_damage;

  // Determine recommended path id from outcome
  const recommendedPathId: SelectedPath = outcome === "claim_review_candidate"
    ? "claim_review"
    : outcome === "full_restoration_candidate"
      ? "full_restoration"
      : outcome === "repair_only"
        ? "direct_repair"
        : null;

  const showAlternatePath = outcome === "claim_review_candidate" || outcome === "full_restoration_candidate";
  const [selectedPath, setSelectedPath_] = useState<SelectedPath>(session.pathData.selectedPath || recommendedPathId);

  const handleContinue = () => {
    const updated = setSelectedPath(session, selectedPath);
    onUpdate(updated);
    onNext();
  };

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606]">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(99,102,241,0.05),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.03),transparent_60%)]" />
      </div>

      <div className="absolute top-10 left-10 z-30 hidden lg:flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-[#E8EDF8] text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-8 pt-20 pb-36 min-h-0">
        <div className="max-w-4xl mx-auto w-full space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-center"
          >
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md w-fit mx-auto">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-[0.2em] pt-0.5">Recommended Strategy</span>
            </div>
            <h1 className="text-3xl md:text-6xl lg:text-7xl font-display font-medium text-[#E8EDF8] tracking-tight leading-[1.05]">
              {config.headline}
            </h1>
            <p className="text-xl text-[#AABDCF] font-light leading-relaxed max-w-2xl mx-auto">
              {config.explanation}
            </p>
          </motion.div>

          {/* Recommended path card */}
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => setSelectedPath_(recommendedPathId)}
            className={cn(
              "relative w-full p-10 rounded-[48px] overflow-hidden border text-left transition-all duration-500",
              selectedPath === recommendedPathId
                ? "bg-indigo-500/10 border-indigo-500/40 shadow-2xl"
                : "bg-white/[0.02] border-white/[0.1] hover:border-white/20"
            )}
          >
            <div
              className="absolute inset-0 opacity-20 blur-3xl pointer-events-none"
              style={{ background: `radial-gradient(circle at center, ${config.cardColor}, transparent)` }}
            />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-10">
              <div className="md:col-span-4 flex flex-col items-start gap-5">
                <div
                  className="w-16 h-16 rounded-[24px] flex items-center justify-center shadow-2xl"
                  style={{ background: config.cardColor }}
                >
                  <config.icon className="w-8 h-8 text-[#E8EDF8]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-mono uppercase tracking-[0.3em] px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">Recommended</span>
                  </div>
                  <p className="text-2xl font-display font-medium text-[#E8EDF8]">{config.pathLabel}</p>
                  <p className="text-[#AABDCF] font-light text-sm uppercase tracking-widest mt-1">Hustad Certified Path</p>
                </div>
              </div>
              <div className="md:col-span-8 space-y-6 border-l border-white/5 pl-0 md:pl-10">
                <h3 className="text-[10px] font-mono text-indigo-300 uppercase tracking-[0.3em]">What happens next</h3>
                <div className="space-y-3">
                  {config.nextSteps.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      className="flex items-start gap-4"
                    >
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500/40 shrink-0" />
                      <p className="text-[#DDE5F5] font-light text-base leading-relaxed">{step}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
            {selectedPath === recommendedPathId && (
              <motion.div layoutId="path-check" className="absolute top-8 right-8">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
              </motion.div>
            )}
          </motion.button>

          {/* Alternate path — direct repair always visible as legitimate option */}
          {showAlternatePath && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => setSelectedPath_("direct_repair")}
              className={cn(
                "relative w-full p-8 rounded-[40px] border text-left transition-all duration-500",
                selectedPath === "direct_repair"
                  ? "bg-white/10 border-white/30 shadow-xl"
                  : "bg-white/[0.02] border-white/[0.05] hover:border-white/20"
              )}
            >
              <div className="flex items-start gap-6">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                  selectedPath === "direct_repair" ? "bg-white text-black" : "bg-white/[0.05] text-[#8BA5C5]"
                )}>
                  <Wrench className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-mono uppercase tracking-[0.3em] px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#8BA5C5]">Alternate Path</span>
                  </div>
                  <p className={cn("text-xl font-display font-medium transition-colors", selectedPath === "direct_repair" ? "text-[#E8EDF8]" : "text-[#DDE5F5]")}>Direct Repair</p>
                  <p className="text-sm text-[#8BA5C5] font-light leading-relaxed mt-1">
                    Address documented items directly — no insurance claim required. Faster scheduling, out-of-pocket cost, full control over timing.
                  </p>
                </div>
              </div>
              {selectedPath === "direct_repair" && (
                <motion.div layoutId="path-check" className="absolute top-6 right-6">
                  <ShieldCheck className="w-5 h-5 text-[#DDE5F5]" />
                </motion.div>
              )}
            </motion.button>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          <button onClick={onBack} className="group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 shrink-0">
            <ArrowLeft className="w-4 h-4 text-[#DDE5F5] group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-[#E8EDF8]">Previous</span>
          </button>
          <StarButton
            onClick={handleContinue}
            lightColor="#FAFAFA"
            backgroundColor="#060606"
            className="flex-1 h-14 md:h-20 rounded-full shadow-[0_20px_60px_rgba(99,102,241,0.2)] active:scale-95 transition-all group"
          >
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">{config.ctaLabel}</span>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}

const PATH_CONFIG: Record<string, {
  headline: string;
  explanation: string;
  icon: any;
  cardColor: string;
  pathLabel: string;
  pathDetail: string;
  nextSteps: string[];
  ctaLabel: string;
}> = {
  no_damage: {
    headline: "Integrity Maintained.",
    explanation: "Based on our forensic analysis, there is no actionable damage requiring a project or claim path today.",
    icon: ShieldCheck,
    cardColor: "#10b981",
    pathLabel: "Maintenance Only",
    pathDetail: "Your property showed no meaningful storm damage during this inspection.",
    nextSteps: ["Immutable documentation delivered for your records.", "Re-inspection recommended after significant storm events.", "Forensic data synced to Hustad CRM for history tracking."],
    ctaLabel: "Review Your Deliverables",
  },
  monitor_only: {
    headline: "Proactive Monitoring.",
    explanation: "Conditions exist that warrant tracking, but no urgent repair or claim path is indicated today.",
    icon: Eye,
    cardColor: "#0ea5e9",
    pathLabel: "Strategic Monitor",
    pathDetail: "Conditions documented for baseline tracking. No contract or authorization is required today.",
    nextSteps: ["Receive a monitor-only summary with re-inspection triggers.", "Schedule a follow-up forensic review in 12 months.", "Review high-resolution imagery for future comparison."],
    ctaLabel: "Review Your Deliverables",
  },
  repair_only: {
    headline: "Precision Restoration.",
    explanation: "Targeted repairs are indicated to preserve system life. Full replacement is not required at this time.",
    icon: Wrench,
    cardColor: "#6366f1",
    pathLabel: "Direct Repair",
    pathDetail: "Repair-specific scope and authorization will be reviewed on the next screen.",
    nextSteps: ["Finalize the surgical repair scope for authorization.", "Bypass insurance claims for faster scheduling.", "Review protection options for the repair zone."],
    ctaLabel: "Review Repair Authorization",
  },
  claim_review_candidate: {
    headline: "Insurance Path Indicated.",
    explanation: "Storm-related damage warrants a formal carrier review to determine policy-level restoration coverage.",
    icon: FileText,
    cardColor: "#f59e0b",
    pathLabel: "Claim Review",
    pathDetail: "Hustad will coordinate forensic documentation with your carrier for coverage determination.",
    nextSteps: ["Review the claim-path authorization on the next screen.", "Coordinate carrier inspection with Hustad field rep.", "Coverage decisions remain with your insurance carrier."],
    ctaLabel: "Review Claim Path",
  },
  full_restoration_candidate: {
    headline: "Full Restoration Priority.",
    explanation: "Evidence supports a complete system restoration to return the property to its pre-loss or peak condition.",
    icon: Zap,
    cardColor: "#f43f5e",
    pathLabel: "Full Restoration",
    pathDetail: "System options and project authorization will be reviewed in the upcoming screens.",
    nextSteps: ["Select premium system and protection options.", "Review the executive project authorization.", "Confirm scheduling and logistics for production."],
    ctaLabel: "Review System Options",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// B14 – Path Decision
// ─────────────────────────────────────────────────────────────────────────────

// B14 is merged into B13. This component auto-forwards to B15.
export function B14PathDecision({ onNext }: Pick<Props, "onNext">) {
  useEffect(() => { onNext(); }, [onNext]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// B15 – Urgent Protection
// ─────────────────────────────────────────────────────────────────────────────

export function B15UrgentProtection({ session, onUpdate, onNext, onBack }: Props) {
  const [authorized, setAuthorized] = useState<boolean | null>(session.findings.urgentProtectionAuthorized);

  const handleContinue = () => {
    if (authorized === null) return;
    const updated: SessionState = {
      ...session,
      findings: { ...session.findings, urgentProtectionAuthorized: authorized },
    };
    const withAudit = addAuditEvent(updated, authorized ? "urgent_protection_authorized" : "urgent_protection_declined");
    onUpdate(withAudit);
    onNext();
  };

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(244,63,94,0.04),transparent_70%)]" />
      </div>

      <div className="absolute top-10 left-10 z-30 hidden lg:flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-[#E8EDF8] text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center pb-32">
        <div className="max-w-4xl w-full space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 backdrop-blur-md w-fit mx-auto">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-[10px] font-mono text-rose-500 uppercase tracking-[0.2em] pt-0.5">Critical Protection Required</span>
            </div>
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[#E8EDF8] tracking-tight leading-[1.05]">
              <span className="text-rose-500">{session.findings.urgentItemsCount} urgent item{session.findings.urgentItemsCount !== 1 ? "s" : ""}</span> need
              <br />immediate attention.
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative p-10 rounded-[48px] bg-rose-500/[0.03] border border-rose-500/[0.1] backdrop-blur-3xl text-left space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-rose-500" />
                </div>
                <p className="text-lg font-display font-medium text-[#E8EDF8]">Loss Containment Recommended</p>
              </div>
              <p className="text-[#AABDCF] font-light leading-relaxed">
                {session.findings.summaryBody ? session.findings.summaryBody.slice(0, 150) + "..." : "Urgent stabilization or narrow-scope immediate work is recommended."}
              </p>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#7090B0] mt-1" />
                <p className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-widest leading-relaxed">This is loss containment, not upsell. Scope is limited to documented urgent items.</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { val: true, label: "Authorize Urgent Protection", detail: "Schedule stabilization or immediate repair for documented items.", icon: CheckCircle2, color: "rose" },
                { val: false, label: "Skip Protection for Now", detail: "Continue with primary project path. Noted in your summary.", icon: ExternalLink, color: "white" }
              ].map((opt) => {
                const isSelected = authorized === opt.val;
                return (
                  <motion.button
                    key={String(opt.val)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setAuthorized(opt.val)}
                    className={cn(
                      "w-full text-left p-6 rounded-[32px] border transition-all duration-300 group overflow-hidden relative",
                      isSelected 
                        ? (opt.val ? "bg-rose-500/10 border-rose-500/40 shadow-2xl" : "bg-white/10 border-white/20 shadow-xl")
                        : "bg-white/[0.02] border-white/[0.05] hover:border-white/20"
                    )}
                  >
                    <div className="relative z-10 flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        isSelected ? (opt.val ? "bg-rose-500 text-[#E8EDF8]" : "bg-white text-black") : "bg-white/5 text-[#7090B0]"
                      )}>
                        <opt.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className={cn(
                          "font-display font-medium text-lg",
                          isSelected ? "text-[#E8EDF8]" : "text-[#DDE5F5] group-hover:text-[#E8EDF8]"
                        )}>{opt.label}</p>
                        <p className="text-xs text-[#7090B0] font-light mt-1 group-hover:text-[#AABDCF] transition-colors leading-relaxed">{opt.detail}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          <button onClick={onBack} className="group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 shrink-0">
            <ArrowLeft className="w-4 h-4 text-[#DDE5F5] group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-[#E8EDF8]">Back</span>
          </button>
          <StarButton 
            onClick={handleContinue} 
            disabled={authorized === null} 
            lightColor="#FAFAFA" 
            backgroundColor="#060606" 
            className={cn(
              "flex-1 max-w-md h-20 rounded-full transition-all group",
              authorized === null ? "opacity-20 grayscale" : "shadow-[0_20px_60px_rgba(244,63,94,0.2)] active:scale-95"
            )}
          >
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">Continue</span>
              <ChevronRight className="w-5 h-5 text-rose-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}
