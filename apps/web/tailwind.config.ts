import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAFAF7",
        foreground: "#191816",
        muted: "#F0EFE8",
        "muted-foreground": "#68645A",
        border: "#DDD8CC",
        primary: "#223D3A",
        "primary-foreground": "#FFFFFF",
        accent: "#B76E46",
        "accent-foreground": "#FFFFFF",
        destructive: "#A23E3E"
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Mona Sans", "Arial", "sans-serif"],
        mono: ["Berkeley Mono", "SFMono-Regular", "Consolas", "monospace"],
        serif: ["Georgia", "Times New Roman", "serif"]
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(25, 24, 22, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

