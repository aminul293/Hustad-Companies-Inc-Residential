"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`
        relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border
        transition-all duration-300 active:scale-95
        ${isDark
          ? "bg-white/5 border-white/10 text-hustad-tx3 hover:bg-white/10 hover:text-hustad-tx1"
          : "bg-hustad-navy/5 border-hustad-navy/15 text-hustad-navy/60 hover:bg-hustad-navy/10 hover:text-hustad-navy"
        }
        ${className}
      `}
    >
      <span className={`transition-all duration-300 ${isDark ? "opacity-0 scale-50 absolute" : "opacity-100 scale-100"}`}>
        <Sun className="w-3.5 h-3.5" />
      </span>
      <span className={`transition-all duration-300 ${isDark ? "opacity-100 scale-100" : "opacity-0 scale-50 absolute"}`}>
        <Moon className="w-3.5 h-3.5" />
      </span>
      <span className="text-[11px] font-mono uppercase tracking-wider pl-0.5">
        {isDark ? "Dark" : "Light"}
      </span>
    </button>
  );
}
