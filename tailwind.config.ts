import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fedpoly: {
          DEFAULT: "#4A1A45",
          dark: "#3B1537",
          deep: "#2A0E27",
          deeper: "#1E0A1C",
          hover: "#5E2258",
          light: "#6B2764",
          soft: "#F7F2F6",
          muted: "#896A86",
          border: "rgba(74, 26, 69, 0.15)",
        },
        neu: {
          bg: "#ffffff",
          surface: "#ffffff",
          dark: "#2A0E27",
          accent: "#4A1A45",
          accentHover: "#3B1537",
          text: "#1E0A1C",
          muted: "#896A86",
          border: "#E4E4E7",
          success: "#166534",
          danger: "#991B1B",
          warning: "#854D0E",
        },
      },
      fontFamily: {
        heading: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        body: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-sans)", "Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "neu-out": "6px 6px 14px #e2e8f0, -6px -6px 14px #ffffff",
        "neu-in": "inset 4px 4px 8px #e2e8f0, inset -4px -4px 8px #ffffff",
        "neu-out-sm": "3px 3px 7px #e2e8f0, -3px -3px 7px #ffffff",
        "neu-in-sm": "inset 2px 2px 4px #e2e8f0, inset -2px -2px 4px #ffffff",
        "neu-out-lg": "10px 10px 20px #e2e8f0, -10px -10px 20px #ffffff",
        "neu-pressed": "inset 3px 3px 6px #e2e8f0, inset -3px -3px 6px #ffffff",
      },
    },
  },
  plugins: [],
};
export default config;
