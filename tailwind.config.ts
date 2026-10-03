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
        neu: {
          bg: "#ffffff",
          surface: "#ffffff",
          dark: "#121212",
          accent: "#784D28",
          accentHover: "#5E3B1E",
          text: "#000000",
          muted: "#71717A",
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
