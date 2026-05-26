/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ["'Playfair Display'", "Georgia", "serif"],
        editorial: ["'Cormorant Garamond'", "'Cormorant'", "Georgia", "serif"],
        body: ["'DM Sans'", "system-ui", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
        inter: ["'Inter'", "'SF Pro Display'", "system-ui", "sans-serif"],
      },
      colors: {
        slate: {
          950: "#0a0f1e",
        },
        stripi: {
          primary:    "#533afd",
          "primary-deep": "#4434d4",
          "primary-press": "#2e2b8c",
          "primary-soft": "#665efd",
          "primary-subdued": "#b9b9f9",
          dark:       "#1c1e54",
          ink:        "#0d253d",
          "ink-secondary": "#273951",
          "ink-mute": "#64748d",
          canvas:     "#ffffff",
          "canvas-soft": "#f6f9fc",
          "canvas-cream": "#f5e9d4",
          hairline:   "#e3e8ee",
          "success-bg": "#d7f7c2",
          "success-fg": "#0d6a3f",
          "danger-bg":  "#fde2e1",
          "danger-fg":  "#983705",
          "warn-bg":    "#fff5cc",
          "warn-fg":    "#6a4e00",
          ruby:       "#ea2261",
          magenta:    "#f96bee",
          sherbet:    "#ffb56e",
          lavender:   "#b6a5ff",
        },
        hustad: {
          navy: "#0f1d35",
          "navy-light": "#1a2d4f",
          blue: "#1e4d8c",
          "blue-light": "#2563ba",
          sky: "#4a8fd4",
          teal: "#2a8a82",
          "teal-light": "#3aada3",
          cream: "#f5f0e8",
          "cream-dark": "#ebe4d6",
          amber: "#c8923a",
          "amber-light": "#e0a94a",
          red: "#c0392b",
          green: "#27774a",
          mist: "#e8eff7",
          fog: "#d0dcea",
          /* Theme-aware text hierarchy — resolves via CSS variables */
          tx1: "var(--tx1)",
          tx2: "var(--tx2)",
          tx3: "var(--tx3)",
          tx4: "var(--tx4)",
          tx5: "var(--tx5)",
        },
      },
      boxShadow: {
        card: "0 2px 16px rgba(15,29,53,0.10), 0 1px 3px rgba(15,29,53,0.06)",
        "card-hover":
          "0 8px 32px rgba(15,29,53,0.16), 0 2px 8px rgba(15,29,53,0.10)",
        elevated:
          "0 20px 60px rgba(15,29,53,0.20), 0 4px 16px rgba(15,29,53,0.10)",
        inner: "inset 0 2px 8px rgba(15,29,53,0.06)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      animation: {
        "star-btn": "star-btn calc(var(--duration)*1s) linear infinite",
        spotlight: "spotlight 2s ease .75s 1 forwards",
        marquee: "marquee var(--duration) infinite linear",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
      },
      keyframes: {
        "star-btn": {
          "0%": { offsetDistance: "0%" },
          "100%": { offsetDistance: "100%" },
        },
        spotlight: {
          "0%": {
            opacity: 0,
            transform: "translate(-72%, -62%) scale(0.5)",
          },
          "100%": {
            opacity: 1,
            transform: "translate(-50%,-40%) scale(1)",
          },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
      },
    },
  },
  plugins: [],
};
