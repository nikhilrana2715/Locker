/**
 * Quick Lock (ClayLock) Design Tokens
 * Single source of truth for all Claymorphism visual parameters:
 * colors, radii, shadows, typography, and animation curves.
 */

export const clayTokens = {
  // Border Radii
  radii: {
    sm: "16px",
    md: "20px",
    lg: "24px",     // Standard card minimum
    xl: "32px",     // Premium clay card radius
    full: "9999px", // Pill / fully rounded buttons & badges
  },

  // Color Palettes
  colors: {
    // Light Mode Canvas & Surfaces
    light: {
      bg: "#F4F6FC",
      bgSubtle: "#EAEFF9",
      surface: "#FFFFFF",
      surfaceRaised: "#FFFFFF",
      textPrimary: "#1E2538",
      textSecondary: "#5A6582",
      textMuted: "#8E99B5",
      border: "rgba(255, 255, 255, 0.7)",
      ring: "#818CF8",
    },

    // Dark Mode Canvas & Surfaces
    dark: {
      bg: "#12151F",
      bgSubtle: "#181C29",
      surface: "#1F2436",
      surfaceRaised: "#262C42",
      textPrimary: "#F1F5F9",
      textSecondary: "#A0AEC0",
      textMuted: "#64748B",
      border: "rgba(255, 255, 255, 0.08)",
      ring: "#818CF8",
    },

    // Soft Pastel Accents (WCAG AA calibrated against their dark texts & backgrounds)
    pastels: {
      lavender: {
        bg: "#E0E7FF",
        bgHover: "#D6E0FF",
        border: "#C7D2FE",
        text: "#3730A3",
        accent: "#6366F1",
        lightGlow: "rgba(255, 255, 255, 0.9)",
        darkDepth: "rgba(79, 70, 229, 0.22)",
      },
      peach: {
        bg: "#FFEDD5",
        bgHover: "#FFE4C4",
        border: "#FED7AA",
        text: "#9A3412",
        accent: "#F97316",
        lightGlow: "rgba(255, 255, 255, 0.9)",
        darkDepth: "rgba(234, 88, 12, 0.22)",
      },
      mint: {
        bg: "#D1FAE5",
        bgHover: "#C1F5DC",
        border: "#A7F3D0",
        text: "#065F46",
        accent: "#10B981",
        lightGlow: "rgba(255, 255, 255, 0.9)",
        darkDepth: "rgba(5, 150, 105, 0.22)",
      },
      sky: {
        bg: "#E0F2FE",
        bgHover: "#D0ECFD",
        border: "#BAE6FD",
        text: "#075985",
        accent: "#0284C7",
        lightGlow: "rgba(255, 255, 255, 0.9)",
        darkDepth: "rgba(2, 132, 199, 0.22)",
      },
      rose: {
        bg: "#FFE4E6",
        bgHover: "#FFD6DC",
        border: "#FECDD3",
        text: "#9F1239",
        accent: "#F43F5E",
        lightGlow: "rgba(255, 255, 255, 0.9)",
        darkDepth: "rgba(225, 29, 72, 0.22)",
      },
    },
  },

  // Clay Shadow Presets: One soft outer drop shadow + two inset shadows (light top-left, darker bottom-right)
  shadows: {
    // Light Mode Shadows
    light: {
      card: "10px 18px 30px rgba(120, 135, 175, 0.16), inset 3px 3px 6px rgba(255, 255, 255, 0.95), inset -4px -4px 8px rgba(160, 175, 205, 0.22)",
      cardHover: "14px 22px 36px rgba(120, 135, 175, 0.22), inset 4px 4px 8px rgba(255, 255, 255, 0.98), inset -5px -5px 10px rgba(160, 175, 205, 0.26)",
      cardSunken: "inset 4px 4px 8px rgba(140, 155, 185, 0.24), inset -4px -4px 8px rgba(255, 255, 255, 0.95)",
      
      btnDefault: "6px 12px 20px rgba(120, 135, 175, 0.18), inset 2px 2px 4px rgba(255, 255, 255, 0.9), inset -3px -3px 6px rgba(160, 175, 205, 0.25)",
      btnHover: "8px 14px 24px rgba(120, 135, 175, 0.24), inset 3px 3px 5px rgba(255, 255, 255, 0.95), inset -4px -4px 7px rgba(160, 175, 205, 0.28)",
      btnPressed: "3px 4px 8px rgba(120, 135, 175, 0.2), inset 4px 4px 8px rgba(140, 155, 185, 0.32), inset -2px -2px 4px rgba(255, 255, 255, 0.8)",

      input: "inset 3px 3px 6px rgba(140, 155, 185, 0.22), inset -3px -3px 6px rgba(255, 255, 255, 0.92)",
      inputFocus: "0 0 0 3px rgba(99, 102, 241, 0.2), inset 3px 3px 6px rgba(140, 155, 185, 0.25), inset -3px -3px 6px rgba(255, 255, 255, 0.95)",

      toggleTrackOff: "inset 3px 3px 6px rgba(140, 155, 185, 0.25), inset -2px -2px 4px rgba(255, 255, 255, 0.9)",
      toggleTrackOn: "inset 3px 3px 6px rgba(5, 150, 105, 0.35), inset -2px -2px 4px rgba(255, 255, 255, 0.7)",
      toggleKnob: "3px 6px 12px rgba(100, 115, 150, 0.25), inset 2px 2px 3px rgba(255, 255, 255, 0.95), inset -2px -2px 3px rgba(160, 175, 205, 0.3)",
    },

    // Dark Mode Shadows
    dark: {
      card: "12px 22px 38px rgba(0, 0, 0, 0.45), inset 2px 2px 4px rgba(255, 255, 255, 0.08), inset -4px -4px 8px rgba(0, 0, 0, 0.4)",
      cardHover: "16px 26px 44px rgba(0, 0, 0, 0.55), inset 3px 3px 5px rgba(255, 255, 255, 0.12), inset -5px -5px 10px rgba(0, 0, 0, 0.45)",
      cardSunken: "inset 4px 4px 8px rgba(0, 0, 0, 0.55), inset -3px -3px 6px rgba(255, 255, 255, 0.05)",

      btnDefault: "6px 12px 20px rgba(0, 0, 0, 0.4), inset 2px 2px 4px rgba(255, 255, 255, 0.12), inset -3px -3px 6px rgba(0, 0, 0, 0.35)",
      btnHover: "8px 16px 26px rgba(0, 0, 0, 0.5), inset 2px 2px 5px rgba(255, 255, 255, 0.16), inset -4px -4px 7px rgba(0, 0, 0, 0.4)",
      btnPressed: "2px 4px 8px rgba(0, 0, 0, 0.5), inset 4px 4px 8px rgba(0, 0, 0, 0.6), inset -2px -2px 4px rgba(255, 255, 255, 0.06)",

      input: "inset 3px 3px 6px rgba(0, 0, 0, 0.55), inset -2px -2px 5px rgba(255, 255, 255, 0.05)",
      inputFocus: "0 0 0 3px rgba(129, 140, 248, 0.3), inset 3px 3px 6px rgba(0, 0, 0, 0.6), inset -2px -2px 5px rgba(255, 255, 255, 0.06)",

      toggleTrackOff: "inset 3px 3px 6px rgba(0, 0, 0, 0.6), inset -2px -2px 4px rgba(255, 255, 255, 0.05)",
      toggleTrackOn: "inset 3px 3px 6px rgba(5, 150, 105, 0.6), inset -2px -2px 4px rgba(255, 255, 255, 0.1)",
      toggleKnob: "3px 6px 12px rgba(0, 0, 0, 0.5), inset 2px 2px 3px rgba(255, 255, 255, 0.35), inset -2px -2px 3px rgba(0, 0, 0, 0.3)",
    },
  },

  // Animations & Transitions
  animations: {
    duration: {
      fast: 150,   // ms - for button press
      normal: 200, // ms - for hover & state changes
      slow: 350,   // ms - for modals & overlays
    },
    easing: {
      clayPress: [0.25, 0.1, 0.25, 1.0], // Snappy tactile ease
      spring: { type: "spring", stiffness: 450, damping: 25 },
    },
    pressScale: 0.97,
  },
} as const;

export type ClayTheme = "light" | "dark";
export type PastelVariant = "lavender" | "peach" | "mint" | "sky" | "rose";
