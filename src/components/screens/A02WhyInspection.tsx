"use client";

import { useState } from "react";
import type { SessionState } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { motion, AnimatePresence } from "framer-motion";
import { StarButton } from "@/components/ui/star-button";
import { Home, Zap, Droplets, Square, AlertCircle, FileText, ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  session: SessionState;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (s: SessionState) => void;
}

export function A02WhyInspection({ onNext, onBack }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606] selection:bg-indigo-500/30 selection:text-[#E8EDF8]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
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

      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-[#E8EDF8] text-2xl tracking-[0.1em] drop-shadow-sm">HUSTAD</span>
          <span className="text-[10px] font-mono text-[#2D4060] uppercase tracking-[0.3em] pt-0.5">Madison Residential</span>
        </div>
        <div className="mt-2 h-px w-12 bg-gradient-to-r from-white/20 to-transparent" />
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest pt-0.5">Homeowner Education</span>
            </div>
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[#E8EDF8] tracking-tight leading-[1.05] max-w-4xl">
              Hail damage isn&rsquo;t always
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-indigo-300">
                visible from the ground.
              </span>
            </h1>
            <p className="text-base md:text-xl text-[#3F5878] font-light max-w-2xl leading-relaxed">
              Tap any area below to see exactly what we look for and why it matters.
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
                    ? "bg-indigo-500/[0.06] border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.12)]"
                    : "bg-white/[0.02] border-white/[0.05] hover:border-white/20 hover:bg-white/[0.04]"
                )}
              >
                <div className="relative z-10">
                  <div className={cn(
                    "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-500",
                    selected === i
                      ? "bg-indigo-500/20 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                      : "bg-white/[0.03] border border-white/5"
                  )}>
                    <area.icon className={cn("w-6 h-6 transition-colors duration-300", selected === i ? "text-indigo-400" : "text-[#AABDCF]")} />
                  </div>

                  <h3 className="text-lg md:text-xl font-display font-medium text-[#E8EDF8] mb-2 tracking-tight">
                    {area.label}
                  </h3>
                  <p className="text-sm md:text-base text-[#3F5878] font-light leading-relaxed">
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
                        <div className="mt-5 pt-5 border-t border-indigo-500/20 space-y-2">
                          <p className="text-[10px] font-mono text-indigo-300/60 uppercase tracking-widest">What we document</p>
                          <p className="text-sm text-[#7090B0] font-light leading-relaxed">{area.detail}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {selected !== i && (
                    <p className="text-[10px] font-mono text-white/[0.18] mt-4 tracking-wider">TAP TO EXPLORE</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Banners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-gradient-to-br from-indigo-500/[0.08] to-transparent border border-white/10 p-8 md:p-10 rounded-[40px] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <AlertCircle className="w-24 h-24 text-[#E8EDF8]" />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-mono text-[#7090B0] uppercase tracking-widest pt-0.5">Critical Notice</span>
                </div>
                <p className="text-base md:text-lg text-[#C2D0E4] font-light leading-relaxed">
                  Some hail damage appears over weeks or months.{" "}
                  <span className="text-[#E8EDF8] font-medium underline underline-offset-8 decoration-indigo-500/40">Early documentation</span>{" "}
                  is your strongest asset.
                </p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="bg-white/[0.02] border border-white/[0.05] p-8 md:p-10 rounded-[40px] flex items-center"
            >
              <p className="text-sm md:text-base text-[#3F5878] font-light leading-relaxed italic">
                &ldquo;Experts with integrity on a local and national level. We promise absolute transparency in every finding, ensuring your peace of mind.&rdquo;
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[#567090] group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-[#8BA5C5]">Previous</span>
          </button>
          <StarButton
            onClick={onNext}
            lightColor="#FAFAFA"
            backgroundColor="#060606"
            className="flex-1 h-14 md:h-20 rounded-full shadow-[0_20px_60px_rgba(99,102,241,0.2)] active:scale-95 transition-all group"
          >
            <div className="flex items-center justify-center gap-2 md:gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight">Show Me What You Inspect</span>
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
    description: "Granule loss, bruising, and cracking across the full roof surface.",
    detail: "We document granule density, impact pattern distribution, and bruising depth. Even minor granule loss accelerates aging and may affect warranty validity.",
  },
  {
    icon: Zap,
    label: "Flashing & Edges",
    description: "Metal components around chimneys, vents, and edges that hail hits directly.",
    detail: "Soft metal components record impact density accurately. We measure dent patterns to help establish storm event correlation and timing.",
  },
  {
    icon: Droplets,
    label: "Gutters & Downspouts",
    description: "Dents and granule accumulation that indicate hail size and impact density.",
    detail: "Granule accumulation in gutters is one of the clearest indicators of active shingle deterioration. We photograph and measure to establish baseline.",
  },
  {
    icon: Square,
    label: "Siding & Screens",
    description: "Soft metals that show impact patterns and help date the storm event.",
    detail: "Aluminum screens and siding show consistent impact patterns that help correlate damage to a specific weather event — useful for carrier review.",
  },
  {
    icon: AlertCircle,
    label: "Delayed Failure Risk",
    description: "Conditions that hold today but create leaks or failure within 1–3 years.",
    detail: "Some damage appears stable but degrades quickly under UV and freeze-thaw cycles. We flag these so you're not caught off-guard by a preventable leak.",
  },
  {
    icon: FileText,
    label: "Documentation",
    description: "Photo evidence organized by category for your records.",
    detail: "Every finding is timestamped, geo-tagged, and organized into your digital record — whether or not a project moves forward. This belongs to you.",
  },
];
