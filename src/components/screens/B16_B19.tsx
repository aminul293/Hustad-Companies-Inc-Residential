"use client";

import { useState, useEffect } from "react";
import type { SessionState, OutcomeType } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ElegantShape } from "@/components/ui/shape-landing-hero";
import { StarButton } from "@/components/ui/star-button";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Zap, 
  Eye, 
  Wrench, 
  FileText, 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft,
  LayoutGrid,
  Mail,
  MessageSquare,
  Download,
  Info,
  Clock,
  ExternalLink,
  ShieldCheck,
  User,
  PenTool,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { submitSession, addAuditEvent, createFollowUpTask, exportSessionJSON } from "@/lib/session";

interface Props {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
  onFinish?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// B16 – System & Protection Options
// ─────────────────────────────────────────────────────────────────────────────

export function B16SystemOptions({ session, onUpdate, onNext, onBack }: Props) {
  const [manufacturer, setManufacturer] = useState(session.pathData.manufacturerSelected);
  const [impactUpgrade, setImpactUpgrade] = useState(session.pathData.impactUpgradeSelected);
  const [warranty, setWarranty] = useState(session.pathData.warrantyOptionSelected);

  const handleContinue = () => {
    const updated: SessionState = {
      ...session,
      pathData: {
        ...session.pathData,
        manufacturerSelected: manufacturer,
        impactUpgradeSelected: impactUpgrade,
        warrantyOptionSelected: warranty,
      },
    };
    onUpdate(updated);
    onNext();
  };

  const warrantyOptions = manufacturer === "GAF"
    ? ["System Plus", "Silver Pledge", "Golden Pledge"]
    : manufacturer === "OwensCorning"
    ? ["System Protection", "Preferred Protection", "Platinum Protection"]
    : manufacturer === "CertainTeed"
    ? ["Standard", "SureStart", "5-Star"]
    : [];

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
        <ProgressBar currentScreen="B16_system_options" phase="B" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-10 pt-12 pb-40">
        <div className="max-w-5xl mx-auto space-y-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center gap-3 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md w-fit">
              <Shield className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest pt-0.5">System Configuration</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter leading-[1.05]">
              Choose your system
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">and protection level.</span>
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-10">
              {/* Manufacturer Grid */}
              <section className="space-y-6">
                <p className="text-[10px] font-mono text-white/70 uppercase tracking-[0.3em] pl-2">Precision Manufacturer</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(["GAF", "OwensCorning", "CertainTeed"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setManufacturer(m); setWarranty(""); }}
                      className={cn(
                        "p-6 rounded-[32px] border transition-all duration-300 text-center",
                        manufacturer === m 
                          ? "bg-indigo-500/20 border-indigo-500/50 shadow-xl" 
                          : "bg-white/[0.03] border-white/[0.05] hover:border-white/20"
                      )}
                    >
                      <p className={cn("text-lg font-display font-medium", manufacturer === m ? "text-white" : "text-white/90")}>
                        {m === "OwensCorning" ? "Owens Corning" : m}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              {/* Warranty Bento */}
              {manufacturer && (
                <section className="space-y-6">
                  <p className="text-[10px] font-mono text-white/70 uppercase tracking-[0.3em] pl-2">Protection Tier</p>
                  <div className="grid grid-cols-1 gap-3">
                    {warrantyOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setWarranty(opt)}
                        className={cn(
                          "group flex items-center justify-between p-6 rounded-3xl border transition-all duration-300",
                          warranty === opt 
                            ? "bg-white/10 border-white/30" 
                            : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]"
                        )}
                      >
                        <span className={cn("text-base font-display font-medium", warranty === opt ? "text-white" : "text-white/70")}>{opt}</span>
                        {warranty === opt && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="lg:col-span-5 space-y-10">
              {/* Impact Upgrade Card */}
              <div className="p-8 rounded-[40px] bg-white/[0.03] border border-white/[0.1] backdrop-blur-3xl space-y-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-xl font-display font-medium text-white">Impact-Resistant Upgrade</p>
                    <p className="text-xs text-white/70 font-light leading-relaxed">Class 3 or Class 4 high-velocity impact rating.</p>
                  </div>
                  <button
                    onClick={() => setImpactUpgrade(!impactUpgrade)}
                    className={cn(
                      "w-14 h-8 rounded-full transition-all duration-300 relative shrink-0",
                      impactUpgrade ? "bg-indigo-500" : "bg-white/10"
                    )}
                  >
                    <div className={cn("absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-md", impactUpgrade ? "left-7" : "left-1")} />
                  </button>
                </div>
                {impactUpgrade && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-start gap-3">
                    <Info className="w-4 h-4 text-indigo-400 mt-1 shrink-0" />
                    <p className="text-[10px] font-mono text-white/70 uppercase tracking-widest leading-relaxed">Laboratory rated protection. Eligibility confirmed in final proposal.</p>
                  </motion.div>
                )}
              </div>
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
          <StarButton onClick={handleContinue} lightColor="#FAFAFA" backgroundColor="#060606" className="flex-1 max-w-md h-16 rounded-full active:scale-95 transition-transform">
            <div className="flex items-center gap-4">
              <span className="text-base font-display font-medium tracking-wide">Agreement Summary</span>
              <ChevronRight className="w-5 h-5 text-white/90" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// B17 – Agreement Summary
// ─────────────────────────────────────────────────────────────────────────────

export function B17AgreementSummary({ session, onUpdate, onNext, onBack }: Props) {
  const [claimRelated, setClaimRelated] = useState<boolean | null>(session.pathData.claimRelatedWork);
  const [acknowledged, setAcknowledged] = useState(session.pathData.agreementAcknowledged);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const outcome = session.findings.outcomeType;
  const isClaimPath = outcome === "claim_review_candidate" || session.pathData.selectedPath === "claim_review";

  const handleContinue = () => {
    const e: Record<string, string> = {};
    if (isClaimPath && claimRelated === null) e.claim = "Please confirm whether this work is related to an insurance claim.";
    if (!acknowledged) e.ack = "Please acknowledge the agreement summary.";
    if (Object.keys(e).length) { setErrors(e); return; }

    const updated: SessionState = {
      ...session,
      pathData: {
        ...session.pathData,
        claimRelatedWork: claimRelated,
        agreementAcknowledged: acknowledged,
      },
    };
    onUpdate(updated);
    onNext();
  };

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Forensic Inspection Drone - Hovering Background */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.08, scale: 1, y: [0, -20, 0] }}
          transition={{ duration: 2, y: { duration: 10, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[10%] left-[5%] w-[500px] h-[500px]"
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

      <div className="relative z-10 flex-1 overflow-y-auto px-10 pt-20 pb-40 text-center">
        <div className="max-w-4xl mx-auto space-y-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md w-fit mx-auto">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-[0.2em] pt-0.5">Authorization Terms</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter leading-[1.05]">
              Before the signature —
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">here is what you are authorizing.</span>
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
            <div className="p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.1] backdrop-blur-3xl space-y-8">
              <p className="font-mono text-[10px] text-white/70 uppercase tracking-[0.3em]">Official Strategy</p>
              <div className="space-y-6">
                {(isClaimPath ? CLAIM_TERMS : REPAIR_TERMS).map((t, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <ChevronRight className="w-4 h-4 text-indigo-400 mt-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                    <p className="text-white/90 font-light text-sm leading-relaxed group-hover:text-white/80 transition-colors">{t}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-10">
              {isClaimPath && (
                <section className="space-y-6">
                  <p className="text-[10px] font-mono text-white/70 uppercase tracking-[0.3em] pl-2">Insurance Status</p>
                  <div className="flex gap-4">
                    {[
                      { val: true, label: "Claim Related", icon: Zap },
                      { val: false, label: "Direct Project", icon: Shield }
                    ].map((opt) => (
                      <button
                        key={String(opt.val)}
                        onClick={() => setClaimRelated(opt.val)}
                        className={cn(
                          "flex-1 p-6 rounded-[32px] border transition-all duration-300 flex flex-col items-center gap-3 text-center",
                          claimRelated === opt.val 
                            ? "bg-indigo-500/20 border-indigo-500/40" 
                            : "bg-white/[0.02] border-white/[0.05] hover:border-white/20"
                        )}
                      >
                        <opt.icon className={cn("w-6 h-6", claimRelated === opt.val ? "text-indigo-400" : "text-white/50")} />
                        <span className={cn("text-xs font-display font-medium", claimRelated === opt.val ? "text-white" : "text-white/70")}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <button
                onClick={() => setAcknowledged(!acknowledged)}
                className={cn(
                  "flex items-start gap-5 p-8 rounded-[40px] border transition-all duration-500 text-left",
                  acknowledged ? "bg-white/10 border-white/30" : "bg-white/[0.02] border-white/[0.05] hover:border-white/20"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-1 transition-all",
                  acknowledged ? "bg-indigo-500 border-indigo-500" : "border-white/20"
                )}>
                  {acknowledged && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <p className="text-sm text-white/50 font-light leading-relaxed">
                  I have read and understood this agreement summary. I understand what I am authorizing and what it does not promise.
                </p>
              </button>
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
          <StarButton onClick={handleContinue} lightColor="#FAFAFA" backgroundColor="#060606" className="flex-1 max-w-md h-16 rounded-full active:scale-95 transition-transform">
            <div className="flex items-center gap-4">
              <span className="text-base font-display font-medium tracking-wide">Continue to Signature</span>
              <ChevronRight className="w-5 h-5 text-white/90" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}

const CLAIM_TERMS = [
  "Hustad will document storm-related damage for coordination with your insurer.",
  "Coverage decisions remain with your insurance carrier. Hustad cannot promise outcomes.",
  "Your deductible and non-covered amounts remain your financial responsibility.",
  "You retain the right to choose your contractor regardless of claim status.",
];

const REPAIR_TERMS = [
  "Hustad will perform specific repair items documented in today's findings.",
  "This authorization covers only the items in scope as presented.",
  "Scheduling will be confirmed after authorization. No work begins before that.",
  "This is a direct contract arrangement — not an insurance claim.",
];

// ─────────────────────────────────────────────────────────────────────────────
// B18 – Signature or Summary Deferral
// ─────────────────────────────────────────────────────────────────────────────

export function B18SignatureDeferral({ session, onUpdate, onNext, onBack }: Props) {
  const [mode, setMode] = useState<"sign" | "defer" | null>(null);
  const [signerName, setSignerName] = useState(session.signatureData.signerName || session.property.homeownerPrimaryName);
  const [signerEmail, setSignerEmail] = useState(session.signatureData.signerEmail || session.property.homeownerPrimaryEmail);
  const [deferEmail, setDeferEmail] = useState(session.signatureData.summarySendRecipient || session.buyerData.decisionMakerEmail);
  const [signed, setSigned] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const e: Record<string, string> = {};
    if (mode === "sign") {
      if (!signerName.trim()) e.name = "Required.";
      if (!signerEmail.trim()) e.email = "Required.";
      if (!signed) e.sig = "Signature required.";
    } else if (mode === "defer") {
      if (!deferEmail.trim()) e.deferEmail = "Delivery email required.";
    } else {
      e.mode = "Choose a path.";
    }
    if (Object.keys(e).length) { setErrors(e); return; }

    let updated: SessionState = { ...session };
    if (mode === "sign") {
      updated = {
        ...updated,
        signatureData: {
          ...updated.signatureData,
          signerName,
          signerEmail,
          signatureImage: "placeholder_sig",
          signedAt: new Date().toISOString()
        },
      };
      updated = submitSession(updated);
    } else {
      updated = {
        ...updated,
        sessionStatus: "deferred",
        signatureData: { ...updated.signatureData, summarySendRecipient: deferEmail },
      };
      updated = addAuditEvent(updated, "summary_sent", { recipient: deferEmail });
    }
    onUpdate(updated);
    onNext();
  };

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <ElegantShape delay={0.2} width={600} height={140} rotate={12} gradient="from-indigo-500/[0.12]" className="left-[-5%] top-[10%]" />
      </div>

      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-white text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-white/70 uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-10 pt-12 pb-40 text-center">
        <div className="max-w-4xl mx-auto space-y-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md w-fit mx-auto">
              <PenTool className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-[0.2em] pt-0.5">Authorization</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter leading-[1.05]">
              Ready to authorize,
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">or send for review?</span>
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {[
              { id: "sign" as const, label: "Authorize Now", detail: "Sign today and confirm next steps.", icon: PenTool },
              { id: "defer" as const, label: "Send for Review", detail: "Share with a co-decision-maker first.", icon: Mail }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setMode(opt.id)}
                className={cn(
                  "p-8 rounded-[40px] border transition-all duration-300 flex flex-col items-center gap-4 text-center",
                  mode === opt.id 
                    ? "bg-indigo-500/20 border-indigo-500/40" 
                    : "bg-white/[0.02] border-white/[0.05] hover:border-white/20"
                )}
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", mode === opt.id ? "bg-indigo-500 text-white" : "bg-white/5 text-white/60")}>
                  <opt.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className={cn("font-display font-medium text-lg", mode === opt.id ? "text-white" : "text-white/90")}>{opt.label}</p>
                  <p className="text-xs text-white/60 font-light mt-1">{opt.detail}</p>
                </div>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {mode === "sign" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono text-white/70 uppercase tracking-widest pl-2">Signer Name</p>
                    <input className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 px-6 text-white placeholder:text-white/50 outline-none focus:border-indigo-500/50" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono text-white/70 uppercase tracking-widest pl-2">Signer Email</p>
                    <input className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 px-6 text-white placeholder:text-white/50 outline-none focus:border-indigo-500/50" type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-white/70 uppercase tracking-widest pl-2">Digital Signature</p>
                  <div 
                    onClick={() => setSigned(true)}
                    className={cn(
                      "w-full h-[124px] rounded-[32px] border flex items-center justify-center transition-all cursor-pointer",
                      signed ? "bg-white/10 border-indigo-500/50" : "bg-white/[0.02] border-dashed border-white/10 hover:bg-white/[0.05]"
                    )}
                  >
                    {signed ? (
                      <p className="text-3xl font-display italic text-white/90 drop-shadow-lg tracking-wider">{signerName || "Authorized"}</p>
                    ) : (
                      <p className="text-[10px] font-mono text-white/50 uppercase tracking-[0.2em]">Tap to Sign</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {mode === "defer" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-md mx-auto text-left space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-white/70 uppercase tracking-widest pl-2">Recipient Email</p>
                  <input className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 px-6 text-white placeholder:text-white/50 outline-none focus:border-indigo-500/50" type="email" value={deferEmail} onChange={(e) => setDeferEmail(e.target.value)} placeholder="Decision maker's email" />
                </div>
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-3">
                  <Info className="w-4 h-4 text-indigo-400 mt-1" />
                  <p className="text-[10px] font-mono text-white/60 uppercase tracking-widest leading-relaxed">System will auto-generate a follow-up task for coordination.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-8 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent pt-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <button onClick={onBack} className="group flex items-center gap-3 px-8 py-5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300">
            <ArrowLeft className="w-4 h-4 text-white/90 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-white">Back</span>
          </button>
          <StarButton onClick={handleSubmit} lightColor="#FAFAFA" backgroundColor="#060606" className="flex-1 max-w-md h-16 rounded-full active:scale-95 transition-transform">
            <div className="flex items-center gap-4">
              <span className="text-base font-display font-medium tracking-wide">
                {mode === "sign" ? "Submit Authorization" : mode === "defer" ? "Send for Review" : "Continue"}
              </span>
              <ChevronRight className="w-5 h-5 text-white/90" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// B19 – Next Steps & Deliverables
// ─────────────────────────────────────────────────────────────────────────────

interface NextStepsProps {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onFinish: () => void;
}

export function B19NextSteps({ session, onUpdate, onFinish }: NextStepsProps) {
  const outcome = session.findings.outcomeType!;
  const isSigned = !!session.signatureData.signedAt;
  const isDeferred = session.sessionStatus === "deferred";
  const config = NEXT_STEPS_CONFIG[outcome] || NEXT_STEPS_CONFIG.no_damage;
  const [exported, setExported] = useState(false);
  const [deliverySent, setDeliverySent] = useState<string | null>(null);

  useEffect(() => {
    if (isDeferred || (!isSigned && (outcome !== "no_damage" && outcome !== "monitor_only"))) {
      const reason = isDeferred ? "Signature deferred" : "Follow-up required";
      onUpdate(createFollowUpTask(session, reason));
    }
  }, []);

  const handleExport = () => {
    const json = exportSessionJSON(session);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `hustad_session_${session.sessionId}.json`; a.click();
    setExported(true);
  };

  const handleDelivery = (method: "email" | "text") => {
    onUpdate(addAuditEvent(session, "summary_delivery_requested", { method, recipient: session.property.homeownerPrimaryEmail }));
    setDeliverySent(method);
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

      <div className="relative z-10 flex-1 overflow-y-auto px-10 pt-20 pb-40 text-center">
        <div className="max-w-5xl mx-auto space-y-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md w-fit mx-auto">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-[0.2em] pt-0.5">
                {isSigned ? "✓ Authorization Complete" : "✓ Session Finalized"}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter leading-[1.05]">
              {config.headline}
            </h1>
            <p className="text-xl text-white/70 font-light leading-relaxed max-w-2xl mx-auto">
              {config.detail}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
            <div className="lg:col-span-7 space-y-8">
              {/* Roadmap Bento */}
              <div className="p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.1] backdrop-blur-3xl space-y-8">
                <p className="font-mono text-[10px] text-white/70 uppercase tracking-[0.3em]">Operational Roadmap</p>
                <div className="space-y-8">
                  {config.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-6 group">
                      <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-indigo-500/50 transition-colors">
                        <span className="text-sm font-mono text-white/70 group-hover:text-white transition-colors">{i + 1}</span>
                      </div>
                      <p className="text-white/90 font-light text-base leading-relaxed pt-1.5 group-hover:text-white/80 transition-colors">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-8">
              {/* Deliverables Bento */}
              <div className="p-8 rounded-[40px] bg-indigo-500/[0.03] border border-indigo-500/[0.1] backdrop-blur-3xl space-y-6">
                <p className="font-mono text-[10px] text-indigo-300 uppercase tracking-[0.3em]">Your Deliverables</p>
                <div className="space-y-4">
                  {DELIVERABLES[outcome]?.map((d, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      </div>
                      <p className="text-white/90 text-sm font-light group-hover:text-white transition-colors">{d}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Matrix */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: "email", label: "Email Summary", icon: Mail },
                  { id: "text", label: "Text Summary", icon: MessageSquare }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleDelivery(opt.id as any)}
                    className={cn(
                      "p-6 rounded-[32px] border transition-all duration-300 flex flex-col items-center gap-3 text-center",
                      deliverySent === opt.id 
                        ? "bg-indigo-500/20 border-indigo-500/40" 
                        : "bg-white/[0.02] border-white/[0.05] hover:border-white/20"
                    )}
                  >
                    <opt.icon className={cn("w-5 h-5", deliverySent === opt.id ? "text-indigo-400" : "text-white/50")} />
                    <span className={cn("text-[10px] font-mono uppercase tracking-widest", deliverySent === opt.id ? "text-white" : "text-white/70")}>
                      {deliverySent === opt.id ? "Sent ✓" : opt.label}
                    </span>
                  </button>
                ))}
              </div>

              <button 
                onClick={handleExport}
                className="w-full p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all flex items-center justify-center gap-3 group"
              >
                <Download className="w-4 h-4 text-white/50 group-hover:text-indigo-400 transition-colors" />
                <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest group-hover:text-white/70 transition-colors">
                  {exported ? "Session Exported ✓" : "Download Session Data (JSON)"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-8 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent pt-20">
        <div className="max-w-md mx-auto">
          <StarButton onClick={onFinish} lightColor="#FAFAFA" backgroundColor="#060606" className="w-full h-18 rounded-full active:scale-95 transition-transform">
            <div className="flex items-center gap-4">
              <span className="text-lg font-display font-medium tracking-wide">Finish Session</span>
              <ChevronRight className="w-5 h-5 text-white/90" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}

const NEXT_STEPS_CONFIG: Record<string, { headline: string; detail: string; steps: string[] }> = {
  no_damage: {
    headline: "Integrity Maintained.",
    detail: "Your property showed no storm damage. Forensic records are ready.",
    steps: ["Receive your no-damage summary via email/text.", "Hustad recommends re-inspection after significant events.", "Documentation is securely archived in the Hustad portal."],
  },
  monitor_only: {
    headline: "Monitor plan confirmed.",
    detail: "Conditions documented for proactive tracking. No action needed today.",
    steps: ["Receive your monitor summary with review triggers.", "Schedule a forensic follow-up in 12 months.", "Contact Hustad if conditions change prematurely."],
  },
  repair_only: {
    headline: "Repair authorized.",
    detail: "Thank you for choosing Hustad. Here is the restoration roadmap.",
    steps: ["Receive your signed authorization package by email.", "Production confirms scheduling within 1–2 business days.", "Final quality audit performed upon project completion."],
  },
  claim_review_candidate: {
    headline: "Claim path initiated.",
    detail: "Forensic documentation is secured for your carrier review.",
    steps: ["Receive your claim-ready package and coordination forms.", "Hustad coordinates with your carrier for inspection.", "Policy decisions remain with your insurance carrier."],
  },
  full_restoration_candidate: {
    headline: "Restoration authorized.",
    detail: "Full system restoration project is now underway.",
    steps: ["Receive your signed restoration package by email.", "Production coordinator reach-out within 48 hours.", "Material staging and schedule confirmation to follow."],
  },
};

const DELIVERABLES: Record<string, string[]> = {
  no_damage: ["No-damage summary (PDF)", "Forensic photo record"],
  monitor_only: ["Monitor summary (PDF)", "Check-in roadmap"],
  repair_only: ["Signed authorization (PDF)", "Production scope"],
  claim_review_candidate: ["Claim-ready package (PDF)", "Coordination authorization"],
  full_restoration_candidate: ["Restoration authorization (PDF)", "Warranty & Selections"],
};
