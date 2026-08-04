import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        mirror: {
          surface: "hsl(var(--mirror-surface))",
          glow: "hsl(var(--mirror-glow))",
          reflection: "hsl(var(--mirror-reflection))",
          depth: "hsl(var(--mirror-depth))",
        },
        text: {
          primary: "hsl(var(--text-primary))",
          secondary: "hsl(var(--text-secondary))",
          muted: "hsl(var(--text-muted))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "voice-ring": {
          "0%": { transform: "scale(0.85)", opacity: "0.6" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "voice-bar": {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
        "orb-breathe": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.92" },
          "50%": { transform: "scale(1.06)", opacity: "1" },
        },
        "orb-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.9" },
          "35%": { transform: "scale(1.09)", opacity: "1" },
          "65%": { transform: "scale(1.02)", opacity: "0.96" },
        },
        "orb-drift": {
          "0%, 100%": { transform: "scale(0.97) rotate(0deg)", opacity: "0.8" },
          "50%": { transform: "scale(1.03) rotate(8deg)", opacity: "1" },
        },
        "orb-halo": {
          "0%, 100%": { transform: "scale(0.95)", opacity: "0.35" },
          "50%": { transform: "scale(1.12)", opacity: "0.7" },
        },
        "orb-ripple": {
          "0%": { transform: "scale(0.9)", opacity: "0.55" },
          "100%": { transform: "scale(1.45)", opacity: "0" },
        },
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "voice-ring": "voice-ring 1.8s ease-out infinite",
        "voice-bar": "voice-bar 0.9s ease-in-out infinite",
        "orb-breathe": "orb-breathe 4s ease-in-out infinite",
        "orb-pulse": "orb-pulse 1.6s ease-in-out infinite",
        "orb-drift": "orb-drift 6s ease-in-out infinite",
        "orb-halo": "orb-halo 5s ease-in-out infinite",
        "orb-ripple": "orb-ripple 2.4s ease-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
