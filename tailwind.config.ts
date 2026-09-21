import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        primary: {
          DEFAULT: "#FF7300",
          50: "#fff7ed",
          100: "#ffeed5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#FF7300",
          600: "#e65c00",
          700: "#cc4e00",
          800: "#a33c00",
          900: "#7a2b00",
          950: "#451700",
        },
        brand: {
          DEFAULT: "#FF7300",
          50: "#fff7ed",
          100: "#ffeed5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#FF7300",
          600: "#e65c00",
          700: "#cc4e00",
          800: "#a33c00",
          900: "#7a2b00",
          950: "#451700",
        },
      },
    },
  },
  plugins: [],
};
export default config;
