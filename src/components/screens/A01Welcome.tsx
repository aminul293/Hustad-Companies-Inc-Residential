"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { SessionState } from "@/types/session";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { StarButton } from "@/components/ui/star-button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

function toTitleCase(str?: string) {
  if (!str) return "";
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

interface Props {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  dark?: boolean;
}

export function A01Welcome({ session, onNext, onBack, onSkip }: Props) {
  const { theme } = useTheme();
  const rawName = session.property.homeownerPrimaryName;
  const name = rawName && rawName !== "Unknown Homeowner" ? toTitleCase(rawName) : "";
  const isMobile = useIsMobile();
  const isHighContrast = theme === "high-contrast";

  const backgroundAssets = (
    <div className="absolute inset-0 pointer-events-none overflow-hidden theme-graphic">
      <div
        className="absolute top-0 inset-x-0 h-[55%] opacity-[0.07]"
        style={{ backgroundImage: "url('/images/gradient-mesh-hero.svg')", backgroundSize: "cover", backgroundPosition: "center top" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(37,99,186,0.04),transparent_60%)]" />
      <motion.div
        initial={{ opacity: 0, x: -300 }}
        animate={{ opacity: 0.1, x: 0 }}
        transition={{ duration: 1.5, delay: 0.5 }}
        className="absolute -bottom-20 -left-64 w-[700px] h-[700px]"
      >
        <img src="/images/rapid_response.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-70" />
      </motion.div>
    </div>
  );

  const brandingAnchor = (
    <div className="absolute top-8 left-8 z-20 flex flex-col items-start pointer-events-none">
      <div className="flex flex-col items-center gap-1">
        <img src="/logo.svg" alt="Hustad Logo" className="h-10 w-auto dark:invert opacity-90 transition-all duration-300" />
      </div>
      <div className="mt-2 h-px w-12 bg-gradient-to-r from-[var(--tx3)]/20 to-transparent" />
    </div>
  );

  const cardContent = (
    <>
      <div className="space-y-8 relative z-10">
        <div className="flex items-start gap-5 group/item">
          <div className="w-11 h-11 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-center text-hustad-teal-light shrink-0 border border-[var(--border-color)] shadow-inner mt-0.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <div>
            <p className="font-body font-medium text-[var(--tx1)] text-lg tracking-wide">No decision required.</p>
            <p className="font-body font-light text-[var(--tx3)] text-sm mt-1.5 leading-relaxed max-w-lg">
              Nothing here commits you to anything. It simply helps you understand the review before your rep returns.
            </p>
          </div>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent" />
        <div className="flex items-start gap-5 group/item">
          <div className="w-11 h-11 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-center text-hustad-amber shrink-0 border border-[var(--border-color)] shadow-inner mt-0.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
          </div>
          <div>
            <p className="font-body font-medium text-[var(--tx1)] text-lg tracking-wide">About 5 to 7 minutes at your pace.</p>
            <p className="font-body font-light text-[var(--tx3)] text-sm mt-1.5 leading-relaxed max-w-lg">
              You can move through the basics now or wait for the live review. Either works.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-8 flex flex-col items-center gap-4 relative z-10">
        <StarButton
          onClick={onNext}
          lightColor={isHighContrast ? "#000000" : "#FAFAFA"}
          backgroundColor={isHighContrast ? "#000000" : "#060606"}
          className={`w-full max-w-md h-16 rounded-2xl active:scale-95 transition-all group btn-primary ${
            isHighContrast
              ? "bg-black text-white border-2 border-white"
              : "text-white"
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-lg font-inter font-semibold tracking-tight">Start My Brief Review</span>
            <ArrowRight className="w-5 h-5 text-[#4a8fd4] group-hover:translate-x-1 transition-transform" />
          </div>
        </StarButton>
        <button
          className="text-sm font-body text-[var(--tx3)] hover:text-[var(--tx1)] transition-colors duration-300 flex items-center gap-2"
          onClick={onBack}
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Exit Review</span>
        </button>
        <button
          className="text-sm font-body text-[var(--tx3)] hover:text-[var(--tx1)] transition-colors duration-300"
          onClick={onSkip}
        >
          I will wait for the live review
        </button>
      </div>
    </>
  );

  // ── Mobile portrait: flat scrollable layout, no 3D scroll animation ──
  // Use fixed inset-0 to escape the chain of overflow:hidden ancestors from
  // ScreenRouter and page.tsx — otherwise iOS Safari won't route touch-scroll
  // events to a nested overflow-y:auto element. Because framer-motion keeps a
  // CSS transform on the wrapping motion.div, position:fixed is scoped to that
  // element, so the slide-in/out animation still works correctly.
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 overflow-y-auto bg-[var(--bg-base)] selection:bg-[#2563ba]/30 selection:text-[var(--tx1)]"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehavior: 'contain' }}
      >
        {backgroundAssets}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] invert pointer-events-none" />
        {brandingAnchor}

        <div className="relative z-10 px-5 pt-20 pb-12 animate-in fade-in duration-700">
          {/* Title */}
          <div className="text-center space-y-4 mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-sm mx-auto">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <p className="text-[10px] font-mono text-[var(--tx3)] uppercase tracking-[0.2em] pt-0.5">Client Portal Active</p>
            </div>
            <h1 className="font-inter font-medium text-[var(--tx1)] text-3xl leading-[1.15] tracking-tight px-2">
              {name ? (
                <><span className="text-[var(--tx3)]">Hello,</span> {name.split(" ")[0]}.<br /></>
              ) : null}
              <span>While we inspect outside,</span>
              <br />
              <span className="font-semibold">here is what to expect.</span>
            </h1>
            <p className="text-sm text-[var(--tx3)] font-light leading-relaxed max-w-sm mx-auto px-2">
              This brief review helps you understand what we check, how we organize findings, and what your rep will review when they return.
            </p>
          </div>

          {/* Card */}
          <div className="relative bg-[var(--bg-surface)] p-6 border border-[var(--border-color)] flex flex-col gap-0 overflow-hidden rounded-3xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-hustad-teal-light/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-hustad-blue/10 rounded-full blur-[80px] pointer-events-none" />
            {cardContent}
          </div>
        </div>
      </div>
    );
  }

  // ── Tablet / Desktop: original ContainerScroll 3D animation ──
  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[var(--bg-base)] selection:bg-[#2563ba]/30 selection:text-[var(--tx1)]">
      {backgroundAssets}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02] invert pointer-events-none" />
      {brandingAnchor}

      <div className="relative z-10 flex-shrink-0 pt-12" />

      <div className="relative z-10 flex-1 overflow-y-auto px-8 animate-in fade-in duration-1000 min-h-0">
        <ContainerScroll
          titleComponent={
            <div className="text-center space-y-8 mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-sm mx-auto">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <p className="text-[11px] font-mono text-[var(--tx3)] uppercase tracking-[0.2em] pt-0.5">Client Portal Active</p>
              </div>
              <h1 className="font-inter font-medium text-[var(--tx1)] text-5xl md:text-8xl leading-[1.1] tracking-tight max-w-6xl mx-auto">
                {name ? (
                  <><span className="text-[var(--tx3)]">Hello,</span> {name.split(" ")[0]}.<br /></>
                ) : null}
                <div className="py-4 leading-[1.15]">
                  <span className="text-[var(--tx1)]">While we inspect outside,</span>
                  <br />
                  <span className="font-semibold text-[var(--tx1)]">here is what to expect.</span>
                </div>
              </h1>
              <p className="text-xl text-[var(--tx3)] font-light max-w-2xl mx-auto leading-relaxed">
                This brief review helps you understand what we check, how we organize findings, and what your rep will review when they return.
              </p>
            </div>
          }
        >
          <div className="relative h-full bg-[var(--bg-surface)] p-8 md:p-12 border border-[var(--border-color)] flex flex-col justify-between overflow-hidden rounded-3xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-hustad-teal-light/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-hustad-blue/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="space-y-10 relative z-10">
              <div className="flex items-start gap-6 group/item transition-transform duration-300 hover:translate-x-1">
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-center text-hustad-teal-light shrink-0 border border-[var(--border-color)] shadow-inner mt-0.5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                </div>
                <div>
                  <p className="font-body font-medium text-[var(--tx1)] text-xl tracking-wide">No decision required.</p>
                  <p className="font-body font-light text-[var(--tx3)] text-base mt-2 leading-relaxed max-w-lg">
                    Nothing here commits you to anything. It simply helps you understand the review before your rep returns.
                  </p>
                </div>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent" />
              <div className="flex items-start gap-6 group/item transition-transform duration-300 hover:translate-x-1">
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-center text-hustad-amber shrink-0 border border-[var(--border-color)] shadow-inner mt-0.5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                </div>
                <div>
                  <p className="font-body font-medium text-[var(--tx1)] text-xl tracking-wide">About 5 to 7 minutes at your pace.</p>
                  <p className="font-body font-light text-[var(--tx3)] text-base mt-2 leading-relaxed max-w-lg">
                    You can move through the basics now or wait for the live review. Either works.
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-10 flex flex-col items-center gap-6 relative z-10">
              <StarButton
                onClick={onNext}
                lightColor={isHighContrast ? "#000000" : "#FAFAFA"}
                backgroundColor={isHighContrast ? "#000000" : "#060606"}
                className={`w-full max-w-md h-20 rounded-2xl active:scale-95 transition-all group btn-primary ${
                  isHighContrast
                    ? "bg-black text-white border-2 border-white"
                    : "text-white"
                }`}
              >
                <div className="flex items-center justify-center gap-4">
                  <span className="text-xl font-inter font-semibold tracking-tight">Start My Brief Review</span>
                  <ArrowRight className="w-6 h-6 text-[#4a8fd4] group-hover:translate-x-1 transition-transform" />
                </div>
              </StarButton>
              <button
                className="text-sm font-body text-[var(--tx3)] hover:text-[var(--tx1)] transition-colors duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-px after:bg-white/20 after:origin-bottom-right after:scale-x-0 hover:after:origin-bottom-left hover:after:scale-x-100 after:transition-transform after:duration-300 flex items-center gap-2"
                onClick={onBack}
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Exit Review</span>
              </button>
              <button
                className="text-sm font-body text-[var(--tx3)] hover:text-[var(--tx1)] transition-colors duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-px after:bg-white/20 after:origin-bottom-right after:scale-x-0 hover:after:origin-bottom-left hover:after:scale-x-100 after:transition-transform after:duration-300 mt-2"
                onClick={onSkip}
              >
                I will wait for the live review
              </button>
            </div>
          </div>
        </ContainerScroll>
      </div>
    </div>
  );
}
