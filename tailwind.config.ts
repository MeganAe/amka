import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#fcf8ff",
        surface: "#ffffff",
        "surface-soft": "#f5f2fe",
        "surface-mid": "#efecf8",
        "surface-high": "#e9e6f3",
        border: "#c7c4d7",
        text: "#1b1b23",
        muted: "#767586",
        primary: "#4648d4",
        secondary: "#00687a",
        error: "#ba1a1a",
        success: "#10b981",
        warning: "#f59e0b"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(27, 27, 35, 0.04), 0 10px 28px rgba(70, 72, 212, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
