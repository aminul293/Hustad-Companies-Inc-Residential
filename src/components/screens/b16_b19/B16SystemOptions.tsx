"use client";

import { useState } from "react";
import type { SessionState } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StarButton } from "@/components/ui/star-button";
import { motion } from "framer-motion";
import {
  Shield,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PRODUCT_CONFIG, IMPACT_DISCLAIMER } from "@/config/products";

interface Props {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
}

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

  const warrantyOptions = manufacturer && PRODUCT_CONFIG[manufacturer]
    ? PRODUCT_CONFIG[manufacturer].warranties
    : [];

  return (
    <div className="relative flex flex-col min-h-screen w-full bg-[#060606]">
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
          <span className="font-display font-bold text-[#E8EDF8] text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-[0.3em]">Madison Residential</span>
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
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[#E8EDF8] tracking-tight leading-[1.05]">
              Choose your system
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-indigo-300">and protection level.</span>
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-10">
              {/* Manufacturer Grid */}
              <section className="space-y-6">
                <p className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-[0.3em] pl-2">Precision Manufacturer</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.values(PRODUCT_CONFIG).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setManufacturer(m.id as any); setWarranty(""); }}
                      className={cn(
                        "p-6 rounded-[32px] border transition-all duration-300 text-center",
                        manufacturer === m.id 
                          ? "bg-indigo-500/20 border-indigo-500/50 shadow-xl" 
                          : "bg-white/[0.03] border-white/[0.05] hover:border-white/20"
                      )}
                    >
                      <p className={cn("text-lg font-display font-medium", manufacturer === m.id ? "text-[#E8EDF8]" : "text-[#DDE5F5]")}>
                        {m.label}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              {/* Warranty Bento */}
              {manufacturer && (
                <section className="space-y-6">
                  <p className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-[0.3em] pl-2">Protection Tier</p>
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
                        <span className={cn("text-base font-display font-medium", warranty === opt ? "text-[#E8EDF8]" : "text-[#AABDCF]")}>{opt}</span>
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
                    <p className="text-xl font-display font-medium text-[#E8EDF8]">Impact-Resistant Upgrade</p>
                    <p className="text-xs text-[#AABDCF] font-light leading-relaxed">Class 3 or Class 4 high-velocity impact rating.</p>
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
                    <p className="text-[10px] font-mono text-[#AABDCF] uppercase tracking-widest leading-relaxed">{IMPACT_DISCLAIMER}</p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent pt-20" />
        <div className="relative max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6 pointer-events-auto">
          <button onClick={onBack} className="group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 shrink-0">
            <ArrowLeft className="w-4 h-4 text-[#DDE5F5] group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-[#E8EDF8]">Back</span>
          </button>
          <StarButton 
            onClick={handleContinue} 
            lightColor="#FAFAFA" 
            backgroundColor="#060606" 
            className="flex-1 h-14 md:h-20 rounded-full shadow-[0_20px_60px_rgba(99,102,241,0.2)] active:scale-95 transition-all group"
          >
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">Agreement Summary</span>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}
