"use client";

interface HustadHeaderProps {
  mode?: "homeowner" | "rep";
  subtitle?: string;
}

export function HustadHeader({ mode = "homeowner", subtitle }: HustadHeaderProps) {
  return (
    <div className="flex-shrink-0 px-8 pt-7 pb-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-hustad-navy text-xl tracking-tight">
              HUSTAD
            </span>
            <span className="text-xs font-mono text-hustad-blue/60 uppercase tracking-widest">
              Madison Residential
            </span>
          </div>
          {subtitle && (
            <p className="text-xs font-body text-hustad-navy/50 mt-0.5 tracking-wide">
              {subtitle}
            </p>
          )}
        </div>
        {mode === "rep" && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-hustad-amber/10 border border-hustad-amber/30">
            <div className="w-1.5 h-1.5 rounded-full bg-hustad-amber animate-pulse" />
            <span className="text-xs font-mono text-hustad-amber font-medium uppercase tracking-wider">
              Rep Mode
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 h-px bg-gradient-to-r from-hustad-navy/20 via-hustad-blue/10 to-transparent" />
    </div>
  );
}
