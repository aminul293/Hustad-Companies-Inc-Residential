"use client";

import { PHASE_A_SCREENS, type ScreenId } from "@/types/session";
import { useSession } from "@/components/SessionProvider";

interface ProgressBarProps {
  currentScreen: ScreenId;
  phase: "A" | "B";
}

export function ProgressBar({ currentScreen, phase }: ProgressBarProps) {
  const { jumpTo, session } = useSession();

  if (phase === "A") {
    const idx = PHASE_A_SCREENS.indexOf(currentScreen as ScreenId);
    
    // We allow jumping to any screen if Phase A is complete, otherwise only to previously visited screens.
    // For a presentation flow, it's often useful to jump back, but we don't want them skipping ahead of their current progress.
    const maxIdx = session?.phaseACompleted ? PHASE_A_SCREENS.length : idx;

    return (
      <div className="px-8 py-6 flex justify-center">
        <div className="relative group max-w-2xl w-full">
          {/* Main Glass Pill Container */}
          <div className="relative bg-white/[0.03] backdrop-blur-2xl rounded-full border border-white/[0.08] px-6 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex items-center justify-between gap-6 transition-all duration-500 hover:border-white/20">
            
            {/* Step Counter Label */}
            <div className="flex flex-col shrink-0">
              <span className="text-[10px] font-mono text-[#3F5878] uppercase tracking-[0.2em] leading-none mb-1">
                Progress
              </span>
              <span className="text-sm font-display font-medium text-[#E8EDF8] tracking-tight">
                {String(Math.max(0, idx + 1)).padStart(2, "0")} <span className="text-[#2D4060] mx-1">/</span> {PHASE_A_SCREENS.length}
              </span>
            </div>

            {/* Segmented Progress Track */}
            <div className="flex-1 flex items-center gap-1.5 h-1.5">
              {PHASE_A_SCREENS.map((_, i) => {
                const isCompleted = i < idx;
                const isActive = i === idx;
                const isClickable = i <= maxIdx || session?.phaseACompleted;
                
                return (
                  <button 
                    key={i}
                    onClick={() => {
                      if (isClickable) jumpTo(PHASE_A_SCREENS[i]);
                    }}
                    disabled={!isClickable}
                    className={`h-full flex-1 rounded-full transition-all duration-700 relative overflow-hidden ${
                      isClickable ? "cursor-pointer hover:bg-white/30" : "cursor-not-allowed opacity-50"
                    } ${
                      isActive 
                        ? "bg-white/20 scale-y-125" 
                        : isCompleted 
                        ? "bg-indigo-500/60" 
                        : "bg-white/5"
                    }`}
                  >
                    {isActive && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-white to-rose-500 animate-pulse pointer-events-none" />
                        <div className="absolute inset-0 blur-[4px] bg-white/50 opacity-50 pointer-events-none" />
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Phase Badge */}
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[10px] font-mono text-[#3F5878] uppercase tracking-[0.2em] leading-none mb-1">
                Phase
              </span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
                <span className="text-sm font-display font-medium text-[#E8EDF8] tracking-tight">
                  A. <span className="text-[#567090] text-xs font-light italic">Portal</span>
                </span>
              </div>
            </div>

          </div>

          {/* Bottom Glow Shadow */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent blur-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6 flex justify-center">
      <div className="relative group max-w-2xl w-full">
        {/* Main Glass Pill Container */}
        <div className="relative bg-white/[0.03] backdrop-blur-2xl rounded-full border border-white/[0.08] px-6 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex items-center justify-between gap-6 transition-all duration-500 hover:border-white/20">
          
          {/* Label */}
          <div className="flex flex-col shrink-0">
            <span className="text-[10px] font-mono text-[#3F5878] uppercase tracking-[0.2em] leading-none mb-1">
              Status
            </span>
            <span className="text-sm font-display font-medium text-[#E8EDF8] tracking-tight">
              Review <span className="text-[#2D4060] mx-1">/</span> Finalize
            </span>
          </div>

          {/* Continuous Progress Track for Phase B */}
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden relative">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-white to-rose-500 transition-all duration-1000 ease-in-out shadow-[0_0_10px_rgba(255,255,255,0.3)]" 
              style={{ width: "50%" }} 
            />
          </div>

          {/* Phase Badge */}
          <div className="flex flex-col items-end shrink-0">
            <span className="text-[10px] font-mono text-[#3F5878] uppercase tracking-[0.2em] leading-none mb-1">
              Phase
            </span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse shadow-[0_0_8px_rgba(251,113,133,0.6)]" />
              <span className="text-sm font-display font-medium text-[#E8EDF8] tracking-tight">
                B. <span className="text-[#567090] text-xs font-light italic">Agreement</span>
              </span>
            </div>
          </div>

        </div>

        {/* Bottom Glow Shadow */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent blur-sm" />
      </div>
    </div>
  );
}
