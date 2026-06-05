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
import { useTheme } from "@/components/ThemeProvider";

interface Props {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
}

export function B16SystemOptions({ session, onUpdate, onNext, onBack }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
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
    <div className={cn("relative flex flex-col h-screen w-full overflow-hidden transition-colors duration-300", isDark ? "bg-[#060606]" : "bg-[#F7F5F1]")}>
      {isDark && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.04),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.03),transparent_60%)]" />
        </div>
      )}

      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
        <div className="flex flex-col items-center gap-1">
          <img src="/logo.svg" alt="Hustad Logo" className="h-10 w-auto dark:invert opacity-90 transition-all duration-300" />
        </div>
      </div>

      <div className="relative z-20 flex-shrink-0 pt-24">
        <ProgressBar currentScreen="B16_system_options" phase="B" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-10 pt-12 pb-40 min-h-0">
        <div className="max-w-5xl mx-auto space-y-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className={cn("flex items-center gap-3 px-3 py-1 rounded-full w-fit border", isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-zinc-100 border-zinc-200")}>
              <Shield className="w-3 h-3 text-indigo-400" />
              <span className={cn("text-[10px] font-mono uppercase tracking-widest pt-0.5", isDark ? "text-indigo-300" : "text-[#1D55C4]")}>System Configuration</span>
            </div>
            <h1 className={cn("text-3xl md:text-6xl lg:text-8xl font-display font-medium tracking-tight leading-[1.05]", isDark ? "text-[#E8EDF8]" : "text-[#1B2B4B]")}>
              Choose your system
              <br />
              <span className={cn("bg-clip-text text-transparent bg-gradient-to-r", isDark ? "from-indigo-300 via-white to-indigo-300" : "from-[#1D55C4] to-[#1540A0]")}>and protection level.</span>
            </h1>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-10">
              {/* Manufacturer Grid */}
              <section className="space-y-6">
                <p className={cn("text-[10px] font-mono uppercase tracking-[0.3em] pl-2", isDark ? "text-[#AABDCF]" : "text-[rgba(27,43,75,0.40)]")}>Precision Manufacturer</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.values(PRODUCT_CONFIG).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setManufacturer(m.id as any); setWarranty(""); }}
                      className={cn(
                        "p-6 rounded-[32px] border transition-all duration-300 text-center",
                        manufacturer === m.id 
                          ? (isDark ? "bg-indigo-500/20 border-indigo-500/50 shadow-xl" : "bg-indigo-50 border-indigo-300 text-[#1D55C4] shadow-sm")
                          : (isDark ? "bg-white/[0.03] border-white/[0.05] hover:border-white/20" : "bg-white border-zinc-200 hover:bg-zinc-50")
                      )}
                    >
                      <p className={cn("text-lg font-display font-medium", 
                        manufacturer === m.id 
                          ? (isDark ? "text-[#E8EDF8]" : "text-[#1D55C4]") 
                          : (isDark ? "text-[#DDE5F5]" : "text-[#1B2B4B]")
                      )}>
                        {m.label}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              {/* Warranty Bento */}
              {manufacturer && (
                <section className="space-y-6">
                  <p className={cn("text-[10px] font-mono uppercase tracking-[0.3em] pl-2", isDark ? "text-[#AABDCF]" : "text-[rgba(27,43,75,0.40)]")}>Protection Tier</p>
                  <div className="grid grid-cols-1 gap-3">
                    {warrantyOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setWarranty(opt)}
                        className={cn(
                          "group flex items-center justify-between p-6 rounded-3xl border transition-all duration-300",
                          warranty === opt 
                            ? (isDark ? "bg-white/10 border-white/30" : "bg-indigo-50 border-indigo-300 shadow-sm") 
                            : (isDark ? "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]" : "bg-white border-zinc-200 hover:bg-zinc-50")
                        )}
                      >
                        <span className={cn("text-base font-display font-medium", 
                          warranty === opt 
                            ? (isDark ? "text-[#E8EDF8]" : "text-[#1D55C4]") 
                            : (isDark ? "text-[#AABDCF]" : "text-[rgba(27,43,75,0.62)]")
                        )}>{opt}</span>
                        {warranty === opt && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="lg:col-span-5 space-y-10">
              {/* Impact Upgrade Card */}
              <div className={cn("p-8 rounded-[40px] border backdrop-blur-3xl space-y-6", isDark ? "bg-white/[0.03] border-white/[0.1]" : "bg-white border-zinc-200 shadow-sm")}>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className={cn("text-xl font-display font-medium", isDark ? "text-[#E8EDF8]" : "text-[#1B2B4B]")}>Impact-Resistant Upgrade</p>
                    <p className={cn("text-xs font-light leading-relaxed", isDark ? "text-[#AABDCF]" : "text-[rgba(27,43,75,0.62)]")}>Class 3 or Class 4 high-velocity impact rating.</p>
                  </div>
                  <button
                    onClick={() => setImpactUpgrade(!impactUpgrade)}
                    className={cn(
                      "w-14 h-8 rounded-full transition-all duration-300 relative shrink-0",
                      impactUpgrade ? "bg-indigo-500" : (isDark ? "bg-white/10" : "bg-zinc-200")
                    )}
                  >
                    <div className={cn("absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-md", impactUpgrade ? "left-7" : "left-1")} />
                  </button>
                </div>
                {impactUpgrade && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} 
                    className={cn("p-4 rounded-2xl border flex items-start gap-3", isDark ? "bg-black/40 border-white/5" : "bg-zinc-50 border-zinc-200")}>
                    <Info className="w-4 h-4 text-indigo-400 mt-1 shrink-0" />
                    <p className={cn("text-[10px] font-mono uppercase tracking-widest leading-relaxed", isDark ? "text-[#AABDCF]" : "text-[rgba(27,43,75,0.62)]")}>{IMPACT_DISCLAIMER}</p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30 pointer-events-none">
        <div className={cn("absolute inset-0 pt-20", isDark ? "bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent" : "bg-gradient-to-t from-[#F7F5F1] via-[#F7F5F1]/90 to-transparent")} />
        <div className="relative max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6 pointer-events-auto">
          <button onClick={onBack} className={cn("group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full border transition-all duration-300 shrink-0", isDark ? "bg-white/10 border-white/20 hover:bg-white/20" : "bg-white border-zinc-200 text-[#1B2B4B] hover:bg-zinc-50")}>
            <ArrowLeft className={cn("w-4 h-4 group-hover:-translate-x-1 transition-transform", isDark ? "text-[#DDE5F5]" : "text-zinc-600")} />
            <span className={cn("text-sm font-display font-medium", isDark ? "text-[#E8EDF8]" : "text-[#1B2B4B]")}>Back</span>
          </button>
          <StarButton 
            onClick={handleContinue} 
            lightColor={isDark ? "#FAFAFA" : "#FFFFFF"}
            backgroundColor={isDark ? "#060606" : "#1D55C4"}
            className={cn("flex-1 h-14 md:h-20 rounded-full transition-all group", isDark ? "shadow-[0_20px_60px_rgba(99,102,241,0.2)] active:scale-95" : "active:scale-95 shadow-sm")}
          >
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">Agreement Summary</span>
              <ChevronRight className={cn("w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform shrink-0", isDark ? "text-indigo-400" : "text-white")} />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}
