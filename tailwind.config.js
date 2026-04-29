/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Playfair Display'", "Georgia", "serif"],
        body: ["'DM Sans'", "system-ui", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
      },
      colors: {
        slate: {
          950: "#0a0f1e",
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
      },
    },
  },
  plugins: [],
};
