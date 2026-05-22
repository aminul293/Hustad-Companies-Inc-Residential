"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "high-contrast";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("hustad-theme") as Theme | null;
    const initial = saved ?? "dark";
    applyTheme(initial);
    setThemeState(initial);
  }, []);

  function applyTheme(next: Theme) {
    const root = document.documentElement;
    root.classList.remove("dark", "high-contrast");
    if (next === "dark") {
      root.classList.add("dark");
    } else if (next === "high-contrast") {
      root.classList.add("high-contrast");
    }
  }

  const setTheme = (next: Theme) => {
    setThemeState(next);
    localStorage.setItem("hustad-theme", next);
    applyTheme(next);
  };

  const toggleTheme = () => {
    const nextTheme: Theme = 
      theme === "light" ? "dark" : 
      theme === "dark" ? "high-contrast" : "light";
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
