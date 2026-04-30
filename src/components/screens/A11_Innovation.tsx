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
import Image from "next/image";

interface Props {
  session: SessionState;
  onNext: () => void;
  onBack: () => void;
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

export function A11Innovation({ onNext, onBack }: Props) {
  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606] selection:bg-indigo-500/30">
      {/* Background HUD Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_70%)]" />
        <motion.div 
          animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.05, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <img src="/images/forensic_hud.png" alt="" className="w-full h-full object-cover grayscale brightness-50" />
        </motion.div>
      </div>

      {/* Branding */}
      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-white text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">Technical Core</span>
        </div>
      </div>

      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A11_innovation" phase="A" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-64 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="space-y-6 mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md">
              <Zap className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest pt-0.5">The Technical Edge</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter leading-[1.05]">
              Forensic analysis.
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">Digital accountability.</span>
            </h1>
            <p className="text-xl text-white/30 font-light max-w-2xl leading-relaxed">
              Hustad replaces manual guesswork with a technical ecosystem designed to protect your asset value.
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
              className="md:col-span-2 md:row-span-2 relative group overflow-hidden rounded-[40px] border border-white/5 bg-white/[0.02] backdrop-blur-3xl"
            >
              <div className="absolute inset-0 z-0">
                <img 
                  src="https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=2070&auto=format&fit=crop" 
                  alt="Drone Tech"
                  className="w-full h-full object-cover opacity-20 group-hover:scale-105 transition-transform duration-700 grayscale"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-[#060606]/40 to-transparent" />
              </div>
              <div className="relative z-10 h-full p-10 flex flex-col justify-end space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Camera className="w-7 h-7 text-indigo-400" />
                </div>
                <h3 className="text-3xl font-display font-medium text-white tracking-tight">Autonomous Inspection</h3>
                <p className="text-lg text-white/40 font-light leading-relaxed max-w-md">
                  High-resolution aerial data capture ensuring zero-miss forensic documentation of every square foot.
                </p>
              </div>
            </motion.div>

            {/* Bento Item 2: Cloud */}
            <motion.div 
              variants={fadeIn}
              whileHover={{ y: -5 }}
              className="md:col-span-2 relative group overflow-hidden rounded-[40px] border border-white/5 bg-white/[0.02] backdrop-blur-3xl p-8"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                    <Cloud className="w-6 h-6 text-rose-400" />
                  </div>
                  <h3 className="text-2xl font-display font-medium text-white tracking-tight">Real-Time Sync</h3>
                  <p className="text-base text-white/40 font-light leading-relaxed">
                    Field data is instantly encrypted and synchronized to your permanent digital property record.
                  </p>
                </div>
                <div className="hidden lg:block w-32 h-32 opacity-20 grayscale brightness-200">
                   <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop" alt="" className="w-full h-full object-cover rounded-full" />
                </div>
              </div>
            </motion.div>

            {/* Bento Item 3: Analysis */}
            <motion.div 
              variants={fadeIn}
              whileHover={{ y: -5 }}
              className="relative group overflow-hidden rounded-[40px] border border-white/5 bg-white/[0.02] backdrop-blur-3xl p-8"
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-xl font-display font-medium text-white tracking-tight">Forensic Core</h3>
                <p className="text-sm text-white/40 font-light leading-relaxed">
                  Technical processing of moisture levels and structural integrity markers.
                </p>
              </div>
            </motion.div>

            {/* Bento Item 4: Reporting */}
            <motion.div 
              variants={fadeIn}
              whileHover={{ y: -5 }}
              className="relative group overflow-hidden rounded-[40px] border border-white/5 bg-white/[0.02] backdrop-blur-3xl p-8"
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-xl font-display font-medium text-white tracking-tight">Digital Vault</h3>
                <p className="text-sm text-white/40 font-light leading-relaxed">
                  A secure archive of all inspection deliverables, accessible 24/7 via your private portal.
                </p>
              </div>
            </motion.div>

          </motion.div>

          {/* Innovation Statement */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="mt-16 p-10 rounded-[40px] border border-white/5 bg-gradient-to-br from-indigo-500/[0.05] to-transparent"
          >
            <div className="flex items-center gap-6">
              <div className="flex -space-x-3">
                 {[1,2,3].map(i => (
                   <div key={i} className="w-10 h-10 rounded-full border-2 border-[#060606] bg-white/10 overflow-hidden">
                     <img src={`https://i.pravatar.cc/100?u=tech${i}`} alt="" className="w-full h-full object-cover grayscale" />
                   </div>
                 ))}
              </div>
              <p className="text-base text-white/40 font-light leading-relaxed">
                <span className="text-white font-medium italic">"Technology is the ultimate truth-teller."</span> 
                <br />Our forensic team uses this tech to ensure your claim is processed with surgical precision.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Navigation */}
      <div className="absolute bottom-0 inset-x-0 p-8 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent pt-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <button onClick={onBack} className="group flex items-center gap-3 px-8 py-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300">
            <ArrowLeft className="w-4 h-4 text-white/40 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-white/60">Priorities</span>
          </button>
          <StarButton onClick={onNext} lightColor="#FAFAFA" backgroundColor="#060606" className="flex-1 max-w-md h-16 rounded-full active:scale-95 transition-transform">
            <div className="flex items-center gap-4">
              <span className="text-base font-display font-medium tracking-wide">Begin Inspection Review</span>
              <ChevronRight className="w-5 h-5 text-white/60" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}
