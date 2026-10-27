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
        paper: "#FBF9F6",
        ink: { DEFAULT: "#1B1418", soft: "#5E555B" },
        rule: "#E3DDD6",
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
        heading: ["var(--font-heading)", "Georgia", "Cambria", "serif"],
        serif: ["var(--font-heading)", "Georgia", "Cambria", "serif"],
        sans: ["var(--font-body)", "system-ui", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
