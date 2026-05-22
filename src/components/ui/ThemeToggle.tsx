"use client";

import { Sun, Moon, Contrast } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch theme (current: ${theme})`}
      className={`
        relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border
        transition-all duration-300 active:scale-95 text-xs font-mono uppercase tracking-wider
        ${theme === "dark"
          ? "bg-white/5 border-white/10 text-hustad-tx2 hover:bg-white/10 hover:text-hustad-tx1"
          : theme === "high-contrast"
          ? "bg-white border-2 border-black text-black hover:bg-black hover:text-white"
          : "bg-hustad-navy/5 border-hustad-navy/15 text-hustad-navy/60 hover:bg-hustad-navy/10 hover:text-hustad-navy"
        }
        ${className}
      `}
    >
      <span className="flex items-center justify-center shrink-0">
        {theme === "light" && <Sun className="w-3.5 h-3.5" />}
        {theme === "dark" && <Moon className="w-3.5 h-3.5" />}
        {theme === "high-contrast" && <Contrast className="w-3.5 h-3.5" />}
      </span>
      <span className="pl-0.5">
        {theme === "light" && "Light"}
        {theme === "dark" && "Dark"}
        {theme === "high-contrast" && "High Contrast"}
      </span>
    </button>
  );
}
