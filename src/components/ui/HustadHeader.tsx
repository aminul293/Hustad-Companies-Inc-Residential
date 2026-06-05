"use client";

import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface HustadHeaderProps {
  mode?: "homeowner" | "rep";
  subtitle?: string;
  showThemeToggle?: boolean;
}

export function HustadHeader({ mode = "homeowner", subtitle, showThemeToggle = true }: HustadHeaderProps) {
  return (
    <div className="flex-shrink-0 px-8 pt-7 pb-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <img 
              src="/logo.svg" 
              alt="Hustad Logo" 
              className="h-6 w-auto dark:invert opacity-90 transition-all duration-300"
            />
            <span className="text-xs font-mono text-hustad-blue/60 dark:text-hustad-tx4 uppercase tracking-widest transition-colors duration-300 pt-1">
              Madison Residential
            </span>
          </div>
          {subtitle && (
            <p className="text-xs font-body text-hustad-navy/50 dark:text-hustad-tx4 mt-0.5 tracking-wide transition-colors duration-300">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {showThemeToggle && <ThemeToggle />}
          {mode === "rep" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-hustad-amber/10 border border-hustad-amber/30">
              <div className="w-1.5 h-1.5 rounded-full bg-hustad-amber animate-pulse" />
              <span className="text-xs font-mono text-hustad-amber font-medium uppercase tracking-wider">
                Rep Mode
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 h-px bg-gradient-to-r from-hustad-navy/20 dark:from-hustad-tx5/30 via-hustad-blue/10 to-transparent transition-colors duration-300" />
    </div>
  );
}
