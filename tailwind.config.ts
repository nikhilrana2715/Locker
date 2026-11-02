import type { Config } from "tailwindcss";
import { clayTokens } from "./src/tokens/clay.tokens";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Nunito", "Poppins", "ui-rounded", "system-ui", "sans-serif"],
        display: ["Poppins", "Nunito", "sans-serif"],
      },
      borderRadius: {
        "clay-sm": clayTokens.radii.sm,
        "clay-md": clayTokens.radii.md,
        "clay-card": clayTokens.radii.lg, // 24px
        "clay-xl": clayTokens.radii.xl,   // 32px
        "clay-full": clayTokens.radii.full,
      },
      colors: {
        clay: {
          light: {
            bg: clayTokens.colors.light.bg,
            subtle: clayTokens.colors.light.bgSubtle,
            surface: clayTokens.colors.light.surface,
            raised: clayTokens.colors.light.surfaceRaised,
            text: clayTokens.colors.light.textPrimary,
            muted: clayTokens.colors.light.textMuted,
          },
          dark: {
            bg: clayTokens.colors.dark.bg,
            subtle: clayTokens.colors.dark.bgSubtle,
            surface: clayTokens.colors.dark.surface,
            raised: clayTokens.colors.dark.surfaceRaised,
            text: clayTokens.colors.dark.textPrimary,
            muted: clayTokens.colors.dark.textMuted,
          },
          pastel: {
            lavender: clayTokens.colors.pastels.lavender.bg,
            "lavender-text": clayTokens.colors.pastels.lavender.text,
            "lavender-accent": clayTokens.colors.pastels.lavender.accent,

            peach: clayTokens.colors.pastels.peach.bg,
            "peach-text": clayTokens.colors.pastels.peach.text,
            "peach-accent": clayTokens.colors.pastels.peach.accent,

            mint: clayTokens.colors.pastels.mint.bg,
            "mint-text": clayTokens.colors.pastels.mint.text,
            "mint-accent": clayTokens.colors.pastels.mint.accent,

            sky: clayTokens.colors.pastels.sky.bg,
            "sky-text": clayTokens.colors.pastels.sky.text,
            "sky-accent": clayTokens.colors.pastels.sky.accent,

            rose: clayTokens.colors.pastels.rose.bg,
            "rose-text": clayTokens.colors.pastels.rose.text,
            "rose-accent": clayTokens.colors.pastels.rose.accent,
          },
        },
      },
      boxShadow: {
        "clay-card": clayTokens.shadows.light.card,
        "clay-card-hover": clayTokens.shadows.light.cardHover,
        "clay-card-sunken": clayTokens.shadows.light.cardSunken,
        "clay-btn": clayTokens.shadows.light.btnDefault,
        "clay-btn-hover": clayTokens.shadows.light.btnHover,
        "clay-btn-pressed": clayTokens.shadows.light.btnPressed,
        "clay-input": clayTokens.shadows.light.input,
        "clay-input-focus": clayTokens.shadows.light.inputFocus,

        "clay-dark-card": clayTokens.shadows.dark.card,
        "clay-dark-card-hover": clayTokens.shadows.dark.cardHover,
        "clay-dark-card-sunken": clayTokens.shadows.dark.cardSunken,
        "clay-dark-btn": clayTokens.shadows.dark.btnDefault,
        "clay-dark-btn-hover": clayTokens.shadows.dark.btnHover,
        "clay-dark-btn-pressed": clayTokens.shadows.dark.btnPressed,
        "clay-dark-input": clayTokens.shadows.dark.input,
      },
    },
  },
  plugins: [],
} satisfies Config;
