"use client";

import type { SessionState } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ElegantShape } from "@/components/ui/shape-landing-hero";
import { motion } from "framer-motion";
import { StarButton } from "@/components/ui/star-button";
import { 
  Home, 
  Zap, 
  Droplets, 
  Square, 
  AlertCircle, 
  FileText,
  ChevronRight,
  ArrowLeft,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  session: SessionState;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (s: SessionState) => void;
}

export function A02WhyInspection({ session, onUpdate, onNext, onBack }: Props) {
  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606] selection:bg-indigo-500/30 selection:text-white">
      {/* Background Assets: Forensic Rapid Deployment Cloud */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Ambient Gradient Lift - Softer */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.04),transparent_70%)]" />

        {/* Forensic Roofing Blueprint - Ultra Subtle Anchor */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.05, scale: 0.85, y: [0, -10, 0] }}
          transition={{ duration: 2, y: { duration: 18, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[10%] -left-24 w-[450px] h-[450px]"
        >
          <img src="/images/roofing_blueprint.png" alt="" className="w-full h-full object-contain mix-blend-screen grayscale" />
        </motion.div>

        {/* Rapid Response Vehicle - Far Corner */}
        <motion.div 
          initial={{ opacity: 0, x: 250 }}
          animate={{ opacity: 0.1, x: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute -bottom-20 -right-48 w-[550px] h-[550px]"
        >
          <img src="/images/rapid_response.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-60" />
        </motion.div>
      </div>

      {/* Persistent Branding Anchor */}
      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-white text-2xl tracking-[0.1em] drop-shadow-sm">
            HUSTAD
          </span>
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] pt-0.5">
            Madison Residential
          </span>
        </div>
        <div className="mt-2 h-px w-12 bg-gradient-to-r from-white/20 to-transparent" />
      </div>

      {/* Header with Progress Bar */}
      <div className="relative z-20 flex-shrink-0 pt-4">
        <ProgressBar currentScreen="A02_why_inspection" phase="A" />
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 md:px-16 pt-12 pb-56">
        <div className="max-w-6xl mx-auto space-y-16">
          
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest pt-0.5">
                Homeowner Education
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter leading-[1.05] max-w-4xl">
              Hail damage isn&rsquo;t always
              <br />
              <span className="relative inline-block">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300 animate-shimmer bg-[length:200%_auto]">
                  visible from the ground.
                </span>
                <span className="absolute -bottom-2 left-0 w-full h-px bg-gradient-to-r from-indigo-500/0 via-indigo-500/40 to-rose-500/0" />
              </span>
            </h1>
            
            <p className="text-xl text-white/30 font-light max-w-2xl leading-relaxed">
              What you can see from your yard rarely tells the full story.
              We look deeper to protect your asset.
            </p>
          </motion.div>

          {/* Inspection areas Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4">
            {INSPECTION_AREAS.map((area, i) => (
              <motion.div 
                key={area.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
                className={cn(
                  "group relative bg-white/[0.02] backdrop-blur-3xl p-8 rounded-[32px] border border-white/[0.05] hover:border-white/20 transition-all duration-700 overflow-hidden",
                  i === 0 || i === 5 ? "md:col-span-3 lg:col-span-6" : "md:col-span-3 lg:col-span-3"
                )}
              >
                {/* Spotlight Effect */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(255,255,255,0.06),transparent_80%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_20px_rgba(99,102,241,0.1)]",
                    "group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                  )}>
                    <area.icon className="w-7 h-7 text-indigo-300 group-hover:text-white transition-colors duration-500" />
                  </div>
                  
                  <h3 className="text-xl font-display font-medium text-white mb-3 tracking-tight">
                    {area.label}
                  </h3>
                  <p className="text-base text-white/30 font-light leading-relaxed group-hover:text-white/50 transition-colors">
                    {area.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Important Banners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-gradient-to-br from-indigo-500/[0.08] to-transparent border border-white/10 p-10 rounded-[40px] relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <AlertCircle className="w-24 h-24 text-white" />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest pt-0.5">Critical Notice</span>
                </div>
                <p className="text-lg text-white/80 font-light leading-relaxed">
                  Some hail damage appears over weeks or months. <span className="text-white font-medium underline underline-offset-8 decoration-indigo-500/40">Early documentation</span> is your strongest asset.
                </p>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white/[0.02] border border-white/[0.05] p-10 rounded-[40px] flex items-center"
            >
              <p className="text-base text-white/30 font-light leading-relaxed italic">
                &ldquo;Experts with integrity on a local and national level. We promise absolute transparency in every finding, ensuring your peace of mind.&rdquo;
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Fixed Premium Footer Actions */}
      <div className="absolute bottom-0 inset-x-0 p-8 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent pt-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <button 
            onClick={onBack}
            className="group flex items-center gap-3 px-8 py-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 text-white/40 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-white/60">Previous Step</span>
          </button>

          <StarButton
            onClick={onNext}
            lightColor="#FAFAFA"
            backgroundColor="#060606"
            className="flex-1 max-w-md h-16 rounded-full shadow-[0_0_40px_rgba(99,102,241,0.2)] active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-4">
              <span className="text-base font-display font-medium tracking-wide">
                Show Me What You Inspect
              </span>
              <ChevronRight className="w-5 h-5 text-white/60" />
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
  },
  {
    icon: Zap,
    label: "Flashing & Edges",
    description: "Metal components around chimneys, vents, and edges that hail hits directly.",
  },
  {
    icon: Droplets,
    label: "Gutters & Downspouts",
    description: "Dents and granule accumulation that indicate hail size and impact density.",
  },
  {
    icon: Square,
    label: "Siding & Screens",
    description: "Soft metals that show impact patterns and help date the storm event.",
  },
  {
    icon: AlertCircle,
    label: "Delayed Failure Risk",
    description: "Conditions that hold today but create leaks or failure within 1–3 years.",
  },
  {
    icon: FileText,
    label: "Documentation",
    description: "Photo evidence organized by category for your records.",
  },
];
