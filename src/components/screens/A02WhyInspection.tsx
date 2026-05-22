"use client";

import { useState } from "react";
import type { SessionState } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { motion, AnimatePresence } from "framer-motion";
import { StarButton } from "@/components/ui/star-button";
import { Home, Zap, Droplets, Square, AlertCircle, FileText, ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

interface Props {
  session: SessionState;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (s: SessionState) => void;
}

export function A02WhyInspection({ onNext, onBack }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const { theme } = useTheme();
  const isHighContrast = theme === "high-contrast";

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[var(--bg-base)] selection:bg-indigo-500/30 selection:text-[var(--tx1)]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden theme-graphic">
        <div
          className="absolute top-0 inset-x-0 h-[45%] opacity-[0.06]"
          style={{ backgroundImage: "url('/images/gradient-mesh-purple.svg')", backgroundSize: "cover", backgroundPosition: "center top" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.04),transparent_70%)]" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.05, scale: 0.85, y: [0, -10, 0] }}
          transition={{ duration: 2, y: { duration: 18, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[10%] -left-24 w-[450px] h-[450px]"
        >
          <img src="/images/roofing_blueprint.png" alt="" className="w-full h-full object-contain mix-blend-screen grayscale" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 250 }}
          animate={{ opacity: 0.1, x: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute -bottom-20 -right-48 w-[550px] h-[550px]"
        >
          <img src="/images/rapid_response.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-60" />
        </motion.div>
      </div>

      <div className="absolute top-10 left-10 z-30 hidden lg:flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-[var(--tx1)] text-2xl tracking-[0.1em] drop-shadow-sm">HUSTAD</span>
          <span className="text-[10px] font-mono text-[var(--tx3)] uppercase tracking-[0.3em] pt-0.5">Madison Residential</span>
        </div>
        <div className="mt-2 h-px w-12 bg-gradient-to-r from-[var(--tx3)]/20 to-transparent" />
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A02_why_inspection" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56 min-h-0">
        <div className="max-w-6xl mx-auto space-y-12">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-color)] backdrop-blur-md">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-mono text-indigo-500 dark:text-indigo-300 uppercase tracking-widest pt-0.5">Homeowner Education</span>
            </div>
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[var(--tx1)] tracking-tight leading-[1.05] max-w-4xl">
              Hail damage is not always
              <br />
              <span className="text-[var(--tx1)]">
                visible from the ground.
              </span>
            </h1>
            <p className="text-base md:text-xl text-[var(--tx3)] font-light max-w-2xl leading-relaxed">
              Some storm damage is hard to confirm from the yard. We document visible roof and exterior conditions before making a recommendation.
            </p>
          </motion.div>

          {/* Interactive Inspection Areas */}
          <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4">
            {INSPECTION_AREAS.map((area, i) => (
              <motion.div
                key={area.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.08 * i, duration: 0.4 }}
                onClick={() => setSelected(selected === i ? null : i)}
                className={cn(
                  "relative backdrop-blur-3xl p-6 md:p-8 rounded-[32px] border transition-all duration-500 cursor-pointer overflow-hidden",
                  i === 0 || i === 5 ? "md:col-span-3 lg:col-span-6" : "md:col-span-3 lg:col-span-3",
                  selected === i
                    ? "bg-[var(--bg-subtle)] border-indigo-500/50 shadow-[0_0_40px_rgba(99,102,241,0.06)]"
                    : "bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[var(--tx3)] hover:bg-[var(--bg-subtle)]"
                )}
              >
                <div className="relative z-10">
                  <div className={cn(
                    "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-500",
                    selected === i
                      ? "bg-indigo-500/20 border border-indigo-500/30"
                      : "bg-[var(--bg-subtle)] border border-[var(--border-color)]"
                  )}>
                    <area.icon className={cn("w-6 h-6 transition-colors duration-300", selected === i ? "text-indigo-500 dark:text-indigo-400" : "text-[var(--tx3)]")} />
                  </div>

                  <h3 className="text-lg md:text-xl font-display font-medium text-[var(--tx1)] mb-2 tracking-tight">
                    {area.label}
                  </h3>
                  <p className="text-sm md:text-base text-[var(--tx3)] font-light leading-relaxed">
                    {area.description}
                  </p>

                  <AnimatePresence>
                    {selected === i && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-5 pt-5 border-t border-[var(--border-color)] space-y-2">
                          <p className="text-[10px] font-mono text-indigo-500 dark:text-indigo-300 uppercase tracking-widest">What we document</p>
                          <p className="text-sm text-[var(--tx2)] font-light leading-relaxed">{area.detail}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {selected !== i && (
                    <p className="text-[10px] font-mono text-[var(--tx4)] mt-4 tracking-wider">TAP TO EXPLORE</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Banners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-[var(--bg-subtle)] border border-[var(--border-color)] p-8 md:p-10 rounded-[40px] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <AlertCircle className="w-24 h-24 text-[var(--tx1)]" />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--tx3)] uppercase tracking-widest pt-0.5">Critical Notice</span>
                </div>
                <p className="text-base md:text-lg text-[var(--tx2)] font-light leading-relaxed">
                  Some damage is not obvious right away.{" "}
                  <span className="text-[var(--tx1)] font-medium underline underline-offset-8 decoration-indigo-500/40">Clear photos and dates</span>{" "}
                  help protect your options.
                </p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-8 md:p-10 rounded-[40px] flex items-center"
            >
              <p className="text-sm md:text-base text-[var(--tx3)] font-light leading-relaxed italic">
                &ldquo;We believe in local accountability and honest findings. If there is no storm damage to report, we will tell you.&rdquo;
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-6 z-30 bg-[var(--bg-base)]/90 backdrop-blur-md border-t border-[var(--border-color)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] transition-all duration-300 shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--tx3)] group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-[var(--tx2)]">Previous</span>
          </button>
          <StarButton
            onClick={onNext}
            lightColor={isHighContrast ? "#000000" : "#FAFAFA"}
            backgroundColor={isHighContrast ? "#000000" : "#060606"}
            className={`flex-1 h-14 md:h-20 rounded-full active:scale-95 transition-all group btn-primary ${
              isHighContrast 
                ? "bg-black text-white border-2 border-white" 
                : "text-white shadow-[0_20px_60px_rgba(99,102,241,0.2)]"
            }`}
          >
            <div className="flex items-center justify-center gap-2 md:gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">Show Me What We Check</span>
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}

const INSPECTION_AREAS = [
  {
    icon: Home,
    label: "Shingles & Ridge",
    description: "Bruising, granule loss, cracking, lifted shingles, and exposed wear patterns across roof areas.",
    detail: "We document granule density, impact pattern distribution, and bruising depth. Even minor granule loss accelerates aging and may affect warranty validity.",
  },
  {
    icon: Zap,
    label: "Flashing & Edges",
    description: "Metal components around chimneys, vents, valleys, and roof edges where impact marks can appear.",
    detail: "Soft metal components record impact density accurately. We measure dent patterns to help establish storm event correlation and timing.",
  },
  {
    icon: Droplets,
    label: "Gutters & Downspouts",
    description: "Dents, loose sections, and granule buildup that help document storm impact.",
    detail: "Granule accumulation in gutters is one of the clearest indicators of active shingle deterioration. We photograph and measure to establish baseline.",
  },
  {
    icon: Square,
    label: "Siding & Screens",
    description: "Visible dents, tears, and impact patterns that help support the overall review.",
    detail: "Aluminum screens and siding show consistent impact patterns that help correlate damage to a specific weather event, useful for carrier review.",
  },
  {
    icon: AlertCircle,
    label: "Delayed Issue Risk",
    description: "Conditions that may not leak today but should be repaired or monitored.",
    detail: "Some damage appears stable but degrades quickly under UV and freeze-thaw cycles. We flag these so you're not caught off-guard by a preventable leak.",
  },
  {
    icon: FileText,
    label: "Documentation",
    description: "Photos grouped by area and finding type for your records.",
    detail: "Every finding is timestamped, geo-tagged, and organized into your project file, whether or not a project moves forward. This belongs to you.",
  },
];
