"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { SessionState } from "@/types/session";
import { HustadHeader } from "@/components/ui/HustadHeader";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { ElegantShape } from "@/components/ui/shape-landing-hero";
import { StarButton } from "@/components/ui/star-button";
import { CheckCircle2, Clock, ArrowRight, ArrowLeft } from "lucide-react";

interface Props {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  dark?: boolean;
}

export function A01Welcome({ session, onUpdate, onNext, onBack, onSkip }: Props) {
  const name = session.property.homeownerPrimaryName;

  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["clear", "productive", "brief", "meaningful", "helpful"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606] selection:bg-indigo-500/30 selection:text-white">
      {/* Background Assets: Forensic Rapid Deployment Cloud */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Ambient Gradient Lift - Cleaner & Softer */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.04),transparent_60%)]" />

        {/* Forensic HUD Data Layer - Ultra Subtle */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.05, scale: [1, 1.02, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <img src="/images/forensic_hud.png" alt="" className="w-full h-full object-cover mix-blend-screen opacity-20 grayscale" />
        </motion.div>

        {/* Forensic Inspection Drone - Far Top Right */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.5, x: 200 }}
          animate={{ opacity: 0.12, scale: 0.7, x: 0, y: [0, -15, 0] }}
          transition={{ duration: 2, y: { duration: 12, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[2%] -right-48 w-[500px] h-[500px]"
        >
          <img src="/images/inspection_drone.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-80" />
        </motion.div>

        {/* Rapid Response Vehicle - Far Bottom Left */}
        <motion.div 
          initial={{ opacity: 0, x: -300 }}
          animate={{ opacity: 0.1, x: 0 }}
          transition={{ duration: 1.5, delay: 0.5 }}
          className="absolute -bottom-20 -left-64 w-[700px] h-[700px]"
        >
          <img src="/images/rapid_response.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-70" />
        </motion.div>

        {/* Forensic Holographic Home - Far Left Center */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.7, x: -200 }}
          animate={{ opacity: 0.08, scale: 0.75, x: 0, y: [0, -10, 0] }}
          transition={{ duration: 2, y: { duration: 15, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[30%] -left-48 w-[450px] h-[450px]"
        >
          <img src="/images/holographic_home.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-80" />
        </motion.div>
      </div>
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] invert pointer-events-none" />

      {/* Persistent Branding Anchor */}
      <div className="absolute top-8 left-8 z-20 flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-white text-2xl tracking-[0.1em]">
            HUSTAD
          </span>
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] pt-0.5">
            Madison Residential
          </span>
        </div>
        <div className="mt-2 h-px w-12 bg-gradient-to-r from-white/20 to-transparent" />
      </div>

      <div className="relative z-10 flex-shrink-0 pt-12">
        {/* Progress bar removed for cleaner Welcome experience */}
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-8 animate-in fade-in duration-1000">
        <ContainerScroll
          titleComponent={
            <div className="text-center space-y-8 mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] shadow-sm mx-auto">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <p className="text-[11px] font-mono text-white/60 uppercase tracking-[0.2em] pt-0.5">
                  Client Portal Active
                </p>
              </div>
              
              <h1 className="font-display font-medium text-white text-5xl md:text-8xl leading-[1.1] tracking-tight max-w-6xl mx-auto">
                {name ? (
                  <>
                    <span className="text-white/50">Hello,</span> {name.split(" ")[0]}.
                  </>
                ) : "Welcome."}
                <br />
                <div className="flex flex-col md:flex-row justify-center items-center md:items-baseline gap-x-4 py-8">
                  <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 whitespace-nowrap">
                    Let&rsquo;s have a 
                  </span>
                  <span className="relative inline-flex items-baseline overflow-hidden min-w-[300px] md:min-w-[420px]">
                    {/* Ghost element to set the baseline and height */}
                    <span className="opacity-0 pointer-events-none select-none pb-2">
                      walkthrough
                    </span>
                    {titles.map((title, index) => (
                      <motion.div
                        key={index}
                        className="absolute inset-0 flex items-center justify-center font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white to-indigo-300 whitespace-nowrap pb-2"
                        initial={{ opacity: 0, y: "100%" }}
                        transition={{ type: "spring", stiffness: 80, damping: 18 }}
                        animate={
                          titleNumber === index
                            ? { y: 0, opacity: 1 }
                            : { y: titleNumber > index ? "-150%" : "150%", opacity: 0 }
                        }
                      >
                        {title}
                      </motion.div>
                    ))}
                  </span>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-white to-indigo-200 whitespace-nowrap">
                    walkthrough.
                  </span>
                </div>
              </h1>
            </div>
          }
        >
          <div className="relative h-full bg-white/[0.02] backdrop-blur-3xl p-8 md:p-12 border border-white/10 flex flex-col justify-between overflow-hidden rounded-[30px]">
            {/* Ambient glows inside card */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-hustad-teal-light/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-hustad-blue/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="space-y-10 relative z-10">
              <div className="flex items-start gap-6 group/item transition-transform duration-300 hover:translate-x-1">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-hustad-teal-light shrink-0 border border-white/5 shadow-inner mt-0.5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                </div>
                <div>
                  <p className="font-body font-medium text-white text-xl tracking-wide">
                    No commitment required.
                  </p>
                  <p className="font-body font-light text-white/50 text-base mt-2 leading-relaxed max-w-lg">
                    Nothing you do here is binding. This walkthrough is simply
                    for your information and peace of mind.
                  </p>
                </div>
              </div>
              
              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

              <div className="flex items-start gap-6 group/item transition-transform duration-300 hover:translate-x-1">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-hustad-amber shrink-0 border border-white/5 shadow-inner mt-0.5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                </div>
                <div>
                  <p className="font-body font-medium text-white text-xl tracking-wide">
                    About 7–9 minutes at your own pace.
                  </p>
                  <p className="font-body font-light text-white/50 text-base mt-2 leading-relaxed max-w-lg">
                    The rep will return when the exterior review is
                    complete. Take your time.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-10 flex flex-col items-center gap-6 relative z-10">
              <StarButton
                onClick={onNext}
                lightColor="#FAFAFA"
                backgroundColor="#060606"
                className="w-full max-w-md h-20 rounded-full shadow-[0_20px_60px_rgba(99,102,241,0.2)] active:scale-95 transition-all group"
              >
                <div className="flex items-center justify-center gap-4">
                  <span className="text-xl font-display font-semibold tracking-tight">Start My Walkthrough</span>
                  <ArrowRight className="w-6 h-6 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </StarButton>
              
              <button 
                className="text-sm font-body text-white/30 hover:text-white/60 transition-colors duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-px after:bg-white/20 after:origin-bottom-right after:scale-x-0 hover:after:origin-bottom-left hover:after:scale-x-100 after:transition-transform after:duration-300 flex items-center gap-2"
                onClick={onBack}
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Exit Walkthrough</span>
              </button>
              
              <button 
                className="text-sm font-body text-white/30 hover:text-white/60 transition-colors duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-px after:bg-white/20 after:origin-bottom-right after:scale-x-0 hover:after:origin-bottom-left hover:after:scale-x-100 after:transition-transform after:duration-300 mt-2"
                onClick={onSkip}
              >
                I&rsquo;d rather wait for the live review
              </button>
            </div>
          </div>
        </ContainerScroll>
      </div>
    </div>
  );
}
