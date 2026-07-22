import type { Config } from "tailwindcss";

// Design tokens — see README "Design direction" section for rationale.
// Palette deliberately avoids the generic AI-cream (#F4F1EA) + terracotta (#D97757)
// combination in favor of a stone/paper/wine-wax scheme tied to the
// "sealed letter" concept.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        stone: {
          DEFAULT: "#E4E0D6", // outer background — desk/table
          dark: "#CFC9B8",
        },
        paper: {
          DEFAULT: "#FBF7EE", // the letter itself
          shade: "#F1EADA",
        },
        ink: {
          DEFAULT: "#2B2620", // primary text
          soft: "#5B5448", // secondary text
        },
        wax: {
          DEFAULT: "#7A2432", // seal — deep wine, not terracotta
          dark: "#5A1A24",
          light: "#9B3A49",
        },
        gold: {
          DEFAULT: "#A9823C", // foil accent, used sparingly
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-public-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      keyframes: {
        "seal-crack": {
          "0%": { transform: "scale(1) rotate(0deg)" },
          "40%": { transform: "scale(1.08) rotate(-3deg)" },
          "100%": { transform: "scale(0) rotate(8deg)", opacity: "0" },
        },
        "letter-rise": {
          "0%": { transform: "translateY(12%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "flap-open": {
          "0%": { transform: "rotateX(0deg)" },
          "100%": { transform: "rotateX(180deg)" },
        },
      },
      animation: {
        "seal-crack": "seal-crack 420ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "letter-rise": "letter-rise 520ms cubic-bezier(0.16, 1, 0.3, 1) 180ms forwards",
        "flap-open": "flap-open 380ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
