import type { Config } from "tailwindcss";

/**
 * Agyion design tokens — single source of truth (design_brief §1).
 * Warm, low-saturation earth palette. No blue anywhere in the brand layer.
 */
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Light theme (default, editorial)
        paper: "#FAF6F3", // bg — warm off-white
        cream: "#F5ECE5", // surface — peach-tinted cream
        ink: "#3C3835", // charcoal brown — primary text
        muted: "#AEAAA7", // warm gray — secondary text
        accent: "#BC773F", // terracotta — CTAs, live price, locked state
        sand: "#DEC9B8", // decorative lifelines, hairline dividers
        hairline: "#EEE7E0", // table rows, card borders (1px)
        // Semantic lifecycle colors (same warm ladder)
        ember: "#8F4E2A", // decaying / below zero / negative states
        olive: "#6B7256", // executed / claimed — success
        returned: "#AEAAA7", // returned / expired
        // Dark theme (ink interludes + app dark surfaces)
        night: {
          bg: "#211D1A",
          surface: "#2B2521",
          ink: "#F3ECE4",
          muted: "#8E857E",
          accent: "#CF8850",
          line: "#4A3F35",
          hairline: "#3A332D",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "Menlo", "monospace"],
      },
      transitionTimingFunction: {
        // House curve: fast start, slow settle (design_brief §3.3)
        house: "cubic-bezier(1, 0, 0.3, 0.93)",
      },
    },
  },
  plugins: [],
};
export default config;
