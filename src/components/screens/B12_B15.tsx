"use client";

import { useState } from "react";
import type { SessionState, SelectedPath, OutcomeType } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ElegantShape } from "@/components/ui/shape-landing-hero";
import { StarButton } from "@/components/ui/star-button";
import { SplineScene } from "@/components/ui/splite";
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
  LayoutGrid,
  Lock,
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

export function B12FindingsSummary({ session, onUpdate, onNext, onBack, onRepJump }: Props) {
  const { findings } = session;
  const outcome = findings.outcomeType!;
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const summaryPhotos = session.photoAssets.filter((p) => p.selectedForSummary);

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

        {/* Forensic HUD Data Layer */}
        <motion.div 
          animate={{ opacity: [0.03, 0.05, 0.03], scale: [1, 1.02, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <img src="/images/forensic_hud.png" alt="" className="w-full h-full object-cover mix-blend-screen opacity-20 grayscale" />
        </motion.div>

        {/* National Mobilization Map - Ultra Subtle Accountability */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.05, scale: 0.85, y: [0, -15, 0] }}
          transition={{ duration: 2, y: { duration: 20, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[10%] -left-32 w-[550px] h-[550px]"
        >
          <img src="/images/mobilization_map.png" alt="" className="w-full h-full object-contain mix-blend-screen grayscale" />
        </motion.div>

        {/* Forensic Inspection Drone - Far Top Right */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.5, x: 200 }}
          animate={{ opacity: 0.08, scale: 0.7, x: 0, y: [0, -20, 0] }}
          transition={{ duration: 2, y: { duration: 15, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[2%] -right-48 w-[450px] h-[450px]"
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

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="B12_findings_summary" phase="B" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-10 pt-12 pb-56">
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
              <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter leading-[1.05]">
                {findings.summaryHeadline || "Reviewing your findings."}
              </h1>
            </motion.div>
            
            {session.mode === "rep" && (
              <button 
                onClick={() => setShowUnlockConfirm(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-amber-400 hover:border-amber-500/30 transition-all group active:scale-95 mb-1"
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
                  <p className="font-mono text-[10px] text-white/70 uppercase tracking-[0.3em]">Official Recommendation</p>
                  <div className="space-y-2">
                    <p className="text-3xl font-display font-medium text-white tracking-tight capitalize">
                      {outcome.replace(/_/g, " ")}
                    </p>
                    <p className="text-lg text-white/90 font-light leading-relaxed max-w-md">
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
                  { label: "Monitor", value: findings.monitorItemsCount, icon: Eye, color: "text-white/80", bg: "bg-white/10" },
                ].map((item) => (
                  <div key={item.label} className="bg-white/[0.02] border border-white/[0.05] rounded-[32px] p-8 text-center group hover:bg-white/[0.05] transition-all">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-4", item.bg)}>
                      <item.icon className={cn("w-5 h-5", item.color)} />
                    </div>
                    <p className={cn("text-4xl font-display font-medium mb-1", item.color)}>{item.value}</p>
                    <p className="text-[10px] font-mono text-white/50 uppercase tracking-[0.2em]">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-10">
              {/* Photo Documentation Grid */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Camera className="w-4 h-4 text-white/70" />
                    <h2 className="text-sm font-display font-medium text-white/90 uppercase tracking-[0.2em]">Documentation</h2>
                  </div>
                  <span className="text-[10px] font-mono text-white/70">{summaryPhotos.length} Findings</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {summaryPhotos.length > 0 ? summaryPhotos.slice(0, 4).map((photo) => (
                    <div key={photo.assetId} className="group relative aspect-[4/3] rounded-3xl overflow-hidden border border-white/10 bg-white/[0.02]">
                      <img src={photo.dataUrl} alt="Documentation" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <p className="text-[8px] font-mono text-white uppercase tracking-widest">Captured • {new Date(photo.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )) : [1, 2, 3, 4].map(i => (
                    <div key={i} className="aspect-[4/3] rounded-3xl border border-dashed border-white/10 bg-white/[0.01] flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white/10" />
                    </div>
                  ))}
                </div>
              </section>

              {/* Property Anchor */}
              <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/[0.05] space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <p className="text-[10px] font-mono text-white/70 uppercase tracking-[0.2em]">Property Anchor</p>
                </div>
                <div>
                  <p className="text-lg font-display font-medium text-white">{session.property.address}</p>
                  <p className="text-sm text-white/70 font-light mt-1">{session.property.homeownerPrimaryName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-8 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent pt-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <button onClick={onBack} className="group flex items-center gap-3 px-8 py-5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300">
            <ArrowLeft className="w-4 h-4 text-white/90 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-white">Previous</span>
          </button>
          <StarButton onClick={onNext} lightColor="#FAFAFA" backgroundColor="#060606" className="flex-1 max-w-md h-16 rounded-full active:scale-95 transition-transform">
            <div className="flex items-center gap-4">
              <span className="text-base font-display font-medium tracking-wide">Show Recommended Path</span>
              <ChevronRight className="w-5 h-5 text-white/90" />
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
                <h2 className="text-2xl font-display font-medium text-white">Unlock findings summary?</h2>
                <p className="text-white/70 font-light leading-relaxed">
                  This will return you to findings prep. The buyer-facing summary will be editable again. <br/><span className="text-amber-500/60 text-xs font-mono uppercase tracking-widest">Security Log Entry Required</span>
                </p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowUnlockConfirm(false)} className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/90 font-display font-medium hover:bg-white/10 transition-all">Cancel</button>
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

export function B13RecommendedPath({ session, onNext, onBack }: Props) {
  const outcome = session.findings.outcomeType!;
  const config = PATH_CONFIG[outcome];

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606]">
      {/* Immersive 3D Background */}
      <div className="absolute inset-0 z-0">
        <SplineScene 
          scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
          className="w-full h-full opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#060606] via-transparent to-[#060606]" />
        
        {/* Background Asset: Rapid Response (Subtle) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.05 }}
          className="absolute top-[20%] right-[-5%] w-[500px] h-[500px] pointer-events-none"
        >
          <img src="/images/rapid_response.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-40 grayscale" />
        </motion.div>
      </div>

      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-white text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-white/70 uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center pb-32">
        <div className="max-w-4xl w-full space-y-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md w-fit mx-auto">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-[0.2em] pt-0.5">Recommended Strategy</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter leading-[1.05]">
              {config.headline}
            </h1>
            <p className="text-xl text-white/70 font-light leading-relaxed max-w-2xl mx-auto">
              {config.explanation}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative p-12 rounded-[48px] overflow-hidden border border-white/[0.1] bg-white/[0.02] backdrop-blur-3xl"
          >
            <div 
              className="absolute inset-0 opacity-20 blur-3xl"
              style={{ background: `radial-gradient(circle at center, ${config.cardColor}, transparent)` }}
            />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-12 text-left">
              <div className="md:col-span-4 flex flex-col items-center md:items-start justify-center gap-6">
                <div 
                  className="w-24 h-24 rounded-[32px] flex items-center justify-center shadow-2xl"
                  style={{ background: config.cardColor }}
                >
                  <config.icon className="w-12 h-12 text-white" />
                </div>
                <div className="text-center md:text-left">
                  <p className="text-2xl font-display font-medium text-white">{config.pathLabel}</p>
                  <p className="text-white/70 font-light text-sm uppercase tracking-widest mt-1">Hustad Certified Path</p>
                </div>
              </div>
              <div className="md:col-span-8 space-y-8 border-l border-white/5 pl-0 md:pl-12">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-mono text-indigo-300 uppercase tracking-[0.3em]">Operational Sequence</h3>
                  <div className="space-y-4">
                    {config.nextSteps.map((step, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + (i * 0.1) }}
                        className="flex items-start gap-4 group"
                      >
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500/40 group-hover:bg-indigo-400 transition-colors shrink-0" />
                        <p className="text-white/90 font-light text-base leading-relaxed group-hover:text-white/80 transition-colors">{step}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-8 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent pt-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <button onClick={onBack} className="group flex items-center gap-3 px-8 py-5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300">
            <ArrowLeft className="w-4 h-4 text-white/90 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-white">Previous</span>
          </button>
          <StarButton onClick={onNext} lightColor="#FAFAFA" backgroundColor="#060606" className="flex-1 max-w-md h-16 rounded-full active:scale-95 transition-transform">
            <div className="flex items-center gap-4">
              <span className="text-base font-display font-medium tracking-wide">{config.ctaLabel}</span>
              <ChevronRight className="w-5 h-5 text-white/90" />
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

export function B14PathDecision({ session, onUpdate, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<SelectedPath>(session.pathData.selectedPath);

  const handleContinue = () => {
    if (!selected) return;
    const updated = setSelectedPath(session, selected);
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

      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-white text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-white/70 uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center pb-32">
        <div className="max-w-4xl w-full space-y-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md w-fit mx-auto">
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-[0.2em] pt-0.5">Selection Matrix</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter leading-[1.05]">
              Two legitimate paths exist.
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">Which fits your situation?</span>
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { 
                id: "claim_review" as SelectedPath, 
                label: "Insurance Claim Review", 
                icon: FileText, 
                detail: "Document damage and coordinate with your insurer. Carrier-determined coverage.",
                badge: "Recommended",
                color: "indigo"
              },
              { 
                id: "direct_repair" as SelectedPath, 
                label: "Direct Repair", 
                icon: Wrench, 
                detail: "Repair items directly without an insurance claim. Out of pocket, faster scheduling.",
                badge: "Alternate",
                color: "white"
              }
            ].map((opt, i) => {
              const isSelected = selected === opt.id;
              return (
                <motion.button
                  key={opt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setSelected(opt.id)}
                  className={cn(
                    "group relative p-8 rounded-[40px] border transition-all duration-500 text-left overflow-hidden",
                    isSelected 
                      ? "bg-indigo-500/10 border-indigo-500/40 shadow-2xl" 
                      : "bg-white/[0.02] border-white/[0.05] hover:border-white/20"
                  )}
                >
                  <div className="relative z-10 space-y-6">
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                        isSelected ? "bg-indigo-500 text-white" : "bg-white/[0.05] text-white/60 group-hover:text-white/50"
                      )}>
                        <opt.icon className="w-6 h-6" />
                      </div>
                      <span className={cn(
                        "text-[8px] font-mono uppercase tracking-[0.3em] px-3 py-1 rounded-full border",
                        opt.id === "claim_review" 
                          ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                          : "bg-white/5 border-white/10 text-white/60"
                      )}>
                        {opt.badge}
                      </span>
                    </div>
                    <div>
                      <p className={cn(
                        "text-2xl font-display font-medium transition-colors",
                        isSelected ? "text-white" : "text-white/90 group-hover:text-white/80"
                      )}>
                        {opt.label}
                      </p>
                      <p className="text-sm text-white/60 font-light leading-relaxed mt-2 group-hover:text-white/70 transition-colors">
                        {opt.detail}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <motion.div layoutId="selection-check" className="absolute top-8 right-8">
                      <ShieldCheck className="w-6 h-6 text-indigo-400" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-8 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent pt-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <button onClick={onBack} className="group flex items-center gap-3 px-8 py-5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300">
            <ArrowLeft className="w-4 h-4 text-white/90 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-white">Back</span>
          </button>
          <StarButton onClick={handleContinue} disabled={!selected} lightColor="#FAFAFA" backgroundColor="#060606" className="flex-1 max-w-md h-16 rounded-full active:scale-95 transition-transform">
            <div className="flex items-center gap-4">
              <span className="text-base font-display font-medium tracking-wide">Continue with {selected ? (selected === "claim_review" ? "Claim Review" : "Direct Repair") : "Selected Path"}</span>
              <ChevronRight className="w-5 h-5 text-white/90" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
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
      {/* Background Assets: Rapid Deployment Cloud */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Forensic Inspection Drone - Hovering Top Right */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.12, y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 -right-20 w-[600px] h-[600px]"
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
            <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter leading-[1.05]">
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
                <p className="text-lg font-display font-medium text-white">Loss Containment Recommended</p>
              </div>
              <p className="text-white/70 font-light leading-relaxed">
                {session.findings.summaryBody ? session.findings.summaryBody.slice(0, 150) + "..." : "Urgent stabilization or narrow-scope immediate work is recommended."}
              </p>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-white/50 mt-1" />
                <p className="text-[10px] font-mono text-white/70 uppercase tracking-widest leading-relaxed">This is loss containment, not upsell. Scope is limited to documented urgent items.</p>
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
                        isSelected ? (opt.val ? "bg-rose-500 text-white" : "bg-white text-black") : "bg-white/5 text-white/50"
                      )}>
                        <opt.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className={cn(
                          "font-display font-medium text-lg",
                          isSelected ? "text-white" : "text-white/90 group-hover:text-white"
                        )}>{opt.label}</p>
                        <p className="text-xs text-white/50 font-light mt-1 group-hover:text-white/70 transition-colors leading-relaxed">{opt.detail}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-8 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent pt-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <button onClick={onBack} className="group flex items-center gap-3 px-8 py-5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300">
            <ArrowLeft className="w-4 h-4 text-white/90 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-white">Back</span>
          </button>
          <StarButton onClick={handleContinue} disabled={authorized === null} lightColor="#FAFAFA" backgroundColor="#060606" className="flex-1 max-w-md h-16 rounded-full active:scale-95 transition-transform">
            <div className="flex items-center gap-4">
              <span className="text-base font-display font-medium tracking-wide">Continue</span>
              <ChevronRight className="w-5 h-5 text-white/90" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}
