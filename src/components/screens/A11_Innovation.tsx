"use client";

import { motion } from "framer-motion";
import { 
  Cpu, 
  Database, 
  Cloud, 
  Smartphone, 
  ArrowLeft, 
  ChevronRight,
  Zap,
  Shield,
  Search,
  LayoutGrid,
  FileText,
  Camera
} from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StarButton } from "@/components/ui/star-button";
import type { SessionState } from "@/types/session";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface Props {
  session: SessionState;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (s: SessionState) => void;
}

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export function A11Innovation({ session, onUpdate, onNext, onBack }: Props) {
  const { theme } = useTheme();
  const isHighContrast = theme === "high-contrast";

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[var(--bg-base)] text-[var(--tx1)] selection:bg-indigo-500/30">
      {/* Background HUD Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 theme-graphic">
        {/* Warm interlude variant for technical/innovation screens */}
        <div
          className="absolute top-0 inset-x-0 h-[40%]"
          style={{ backgroundImage: "url('/images/gradient-mesh-warm.svg')", backgroundSize: "cover", backgroundPosition: "center top", opacity: 0.35 }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_70%)]" />
      </div>

      {/* Branding */}
      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <img src="/logo.svg" alt="Hustad Logo" className="h-6 w-auto dark:invert opacity-90 transition-all duration-300" />
          <span className="text-[10px] font-mono text-[var(--tx3)] uppercase tracking-[0.3em]">Technical Core</span>
        </div>
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A11_innovation" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-64 custom-scrollbar min-h-0">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="space-y-6 mb-16"
          >
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full border backdrop-blur-md",
              isHighContrast
                ? "bg-white border-black text-black"
                : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
            )}>
              <Zap className="w-3 h-3" />
              <span className="text-[10px] font-mono uppercase tracking-widest pt-0.5">The Technical Edge</span>
            </div>
            <h1 className="text-3xl md:text-6xl lg:text-8xl font-display font-medium text-[var(--tx1)] tracking-tight leading-[1.05]">
              Digital documentation.
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-[var(--tx1)] to-indigo-500 dark:from-indigo-300 dark:via-white dark:to-indigo-300">Clear accountability.</span>
            </h1>
            <p className="text-xl text-[var(--tx3)] font-light max-w-2xl leading-relaxed mt-8">
              Hustad uses photo documentation and organized review tools to help make the next step clear.
            </p>
          </motion.div>

          {/* Bento Grid */}
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 h-full min-h-[600px]"
          >
            {/* Bento Item 1: Drones */}
            <motion.div 
              variants={fadeIn}
              whileHover={{ y: -5 }}
              className={cn(
                "md:col-span-2 md:row-span-2 relative group overflow-hidden rounded-[40px] border",
                isHighContrast
                  ? "bg-white border-black text-black"
                  : "border-[var(--border-color)] bg-[var(--bg-surface)]"
              )}
            >
              <div className="absolute inset-0 z-0 theme-graphic">
                <img 
                  src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=2070&auto=format&fit=crop" 
                  alt="Drone Tech"
                  className="w-full h-full object-cover opacity-20 group-hover:scale-105 transition-transform duration-700 grayscale"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)]/40 to-transparent" />
              </div>
              <div className="relative z-10 h-full p-10 flex flex-col justify-end space-y-4">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center border",
                  isHighContrast ? "bg-white border-black text-black" : "bg-indigo-50/10 border-indigo-500/20 text-indigo-400"
                )}>
                  <Camera className="w-7 h-7" />
                </div>
                <h3 className="text-3xl font-display font-medium text-[var(--tx1)] tracking-tight">Aerial review</h3>
                <p className="text-lg text-[var(--tx3)] font-light leading-relaxed max-w-md">
                  High-resolution roof-area photos help document visible conditions that are difficult to see from the ground.
                </p>
              </div>
            </motion.div>

            {/* Bento Item 2: Cloud */}
            <motion.div 
              variants={fadeIn}
              whileHover={{ y: -5 }}
              className={cn(
                "md:col-span-2 relative group overflow-hidden rounded-[40px] border p-8",
                isHighContrast
                  ? "bg-white border-black text-black"
                  : "border-[var(--border-color)] bg-[var(--bg-surface)]"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-4">
                  <div className={cn(
                     "w-12 h-12 rounded-xl flex items-center justify-center border",
                     isHighContrast ? "bg-white border-black text-black" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  )}>
                    <Cloud className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-display font-medium text-[var(--tx1)] tracking-tight">Project file sync</h3>
                  <p className="text-base text-[var(--tx3)] font-light leading-relaxed">
                    Field notes and photos are saved to your review file for organized follow-up.
                  </p>
                </div>
                <div className="hidden lg:block w-32 h-32 opacity-20 grayscale brightness-200 theme-graphic">
                   <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop" alt="" className="w-full h-full object-cover rounded-full" />
                </div>
              </div>
            </motion.div>

            {/* Bento Item 3: Analysis */}
            <motion.div 
              variants={fadeIn}
              whileHover={{ y: -5 }}
              className={cn(
                "relative group overflow-hidden rounded-[40px] border p-8",
                isHighContrast
                  ? "bg-white border-black text-black"
                  : "border-[var(--border-color)] bg-[var(--bg-surface)]"
              )}
            >
              <div className="space-y-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border",
                  isHighContrast ? "bg-white border-black text-black" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                )}>
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-display font-medium text-[var(--tx1)] tracking-tight">Technical review</h3>
                <p className="text-sm text-[var(--tx3)] font-light leading-relaxed">
                  Findings are labeled by location, category, and next step so the conversation stays clear.
                </p>
              </div>
            </motion.div>

            {/* Bento Item 4: Reporting */}
            <motion.div 
              variants={fadeIn}
              whileHover={{ y: -5 }}
              className={cn(
                "relative group overflow-hidden rounded-[40px] border p-8",
                isHighContrast
                  ? "bg-white border-black text-black"
                  : "border-[var(--border-color)] bg-[var(--bg-surface)]"
              )}
            >
              <div className="space-y-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border",
                  isHighContrast ? "bg-white border-black text-black" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                )}>
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-display font-medium text-[var(--tx1)] tracking-tight">Digital Vault</h3>
                <p className="text-sm text-[var(--tx3)] font-light leading-relaxed">
                  Your photos and summary stay available in your portal for future reference.
                </p>
              </div>
            </motion.div>

          </motion.div>

          {/* Innovation Statement */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className={cn(
              "mt-16 p-10 rounded-[40px] border",
              isHighContrast
                ? "bg-white border-black text-black"
                : "bg-gradient-to-br from-indigo-500/[0.05] to-transparent border-[var(--border-color)]"
            )}
          >
            <div className="flex items-center gap-6">
              <div className="flex -space-x-3 theme-graphic">
                 {[1,2,3].map(i => (
                   <div key={i} className="w-10 h-10 rounded-full border-2 border-[var(--bg-base)] bg-white/10 overflow-hidden">
                     <img src={`https://i.pravatar.cc/100?u=tech${i}`} alt="" className="w-full h-full object-cover grayscale" />
                   </div>
                 ))}
              </div>
              <p className="text-base text-[var(--tx3)] font-light leading-relaxed">
                <span className="text-[var(--tx1)] font-medium italic">"Technology does not replace judgment. It helps make the review easier to see, explain, and share."</span> 
                <br />Our team uses these tools to help organize your documentation.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Navigation */}
      <div className="absolute bottom-0 inset-x-0 px-4 md:px-8 pb-8 pt-12 md:pt-20 z-30 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)]/90 to-transparent theme-graphic" />
        <div className={cn(
          "relative max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-6 pointer-events-auto p-4 rounded-3xl border",
          isHighContrast
            ? "bg-white border-black text-black"
            : "bg-[var(--bg-surface)]/90 border-[var(--border-color)] text-[var(--tx1)] backdrop-blur-md"
        )}>
          <button 
            onClick={onBack} 
            className={cn(
              "group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full border transition-all duration-300 shrink-0",
              isHighContrast
                ? "bg-white border-black text-black hover:bg-black hover:text-white"
                : "bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--tx1)]"
            )}
          >
            <ArrowLeft className={cn("w-4 h-4 group-hover:-translate-x-1 transition-transform", isHighContrast ? "text-black group-hover:text-white" : "text-[var(--tx3)]")} />
            <span className="text-sm font-display font-medium text-inherit">Priorities</span>
          </button>
          <StarButton
            onClick={onNext}
            lightColor={isHighContrast ? "#000000" : "#FAFAFA"}
            backgroundColor={isHighContrast ? "#FFFFFF" : "#0A0A0A"}
            className={cn(
              "flex-1 h-14 md:h-20 rounded-full border transition-all group",
              isHighContrast
                ? "border-black text-black"
                : "shadow-[0_20px_60px_rgba(99,102,241,0.2)] border-[var(--border-color)] text-white"
            )}
          >
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm md:text-xl font-display font-semibold tracking-tight text-inherit">Begin Findings Review</span>
              <ChevronRight className={cn("w-6 h-6 group-hover:translate-x-1 transition-transform", isHighContrast ? "text-black" : "text-indigo-300")} />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}
