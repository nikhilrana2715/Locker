import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { clayTokens } from "../../tokens/clay.tokens";

export type ClayCardRadius = "md" | "lg" | "xl";
export type ClayCardVariant = "surface" | "lavender" | "peach" | "mint" | "sky" | "sunken";

export interface ClayCardProps extends HTMLMotionProps<"div"> {
  radius?: ClayCardRadius;
  variant?: ClayCardVariant;
  hoverLift?: boolean;
  children: React.ReactNode;
}

export const ClayCard: React.FC<ClayCardProps> = ({
  radius = "lg",
  variant = "surface",
  hoverLift = false,
  className = "",
  children,
  style = {},
  ...props
}) => {
  const radiusMap: Record<ClayCardRadius, string> = {
    md: "rounded-[20px]",
    lg: "rounded-[24px]", // User requirement: 24-32px
    xl: "rounded-[32px]", // User requirement: 24-32px
  };

  const variantStyles: Record<ClayCardVariant, { base: string; style: React.CSSProperties }> = {
    surface: {
      base: "bg-white/95 dark:bg-[#1E2335]/95 text-[#1E2538] dark:text-[#F1F5F9] border border-white/90 dark:border-white/10",
      style: {
        boxShadow:
          "12px 20px 32px rgba(120, 135, 175, 0.16), inset 3px 3px 6px rgba(255, 255, 255, 0.95), inset -4px -4px 8px rgba(160, 175, 205, 0.22)",
      },
    },
    lavender: {
      base: "bg-[#EEF2FF] dark:bg-[#2A2B4A] text-[#312E81] dark:text-[#E0E7FF] border border-[#C7D2FE]/70 dark:border-[#4338CA]/40",
      style: {
        boxShadow:
          "12px 20px 32px rgba(99, 102, 241, 0.16), inset 3px 3px 6px rgba(255, 255, 255, 0.95), inset -4px -4px 8px rgba(79, 70, 229, 0.18)",
      },
    },
    peach: {
      base: "bg-[#FFF7ED] dark:bg-[#3D2821] text-[#7C2D12] dark:text-[#FFEDD5] border border-[#FED7AA]/70 dark:border-[#9A3412]/40",
      style: {
        boxShadow:
          "12px 20px 32px rgba(249, 115, 22, 0.14), inset 3px 3px 6px rgba(255, 255, 255, 0.95), inset -4px -4px 8px rgba(234, 88, 12, 0.16)",
      },
    },
    mint: {
      base: "bg-[#ECFDF5] dark:bg-[#1C332B] text-[#064E3B] dark:text-[#D1FAE5] border border-[#A7F3D0]/70 dark:border-[#047857]/40",
      style: {
        boxShadow:
          "12px 20px 32px rgba(16, 185, 129, 0.14), inset 3px 3px 6px rgba(255, 255, 255, 0.95), inset -4px -4px 8px rgba(5, 150, 105, 0.16)",
      },
    },
    sky: {
      base: "bg-[#F0F9FF] dark:bg-[#1B2F42] text-[#0C4A6E] dark:text-[#E0F2FE] border border-[#BAE6FD]/70 dark:border-[#0284C7]/40",
      style: {
        boxShadow:
          "12px 20px 32px rgba(14, 165, 233, 0.14), inset 3px 3px 6px rgba(255, 255, 255, 0.95), inset -4px -4px 8px rgba(2, 132, 199, 0.16)",
      },
    },
    sunken: {
      base: "bg-[#EAEFF9]/80 dark:bg-[#161924]/80 text-[#1E2538] dark:text-[#F1F5F9] border border-black/5 dark:border-white/5",
      style: {
        boxShadow:
          "inset 4px 4px 8px rgba(140, 155, 185, 0.28), inset -4px -4px 8px rgba(255, 255, 255, 0.95)",
      },
    },
  };

  const selected = variantStyles[variant];

  return (
    <motion.div
      whileHover={
        hoverLift
          ? {
              y: -4,
              transition: { duration: clayTokens.animations.duration.normal / 1000 },
            }
          : undefined
      }
      style={{
        ...selected.style,
        ...style,
      }}
      className={`
        relative backdrop-blur-md transition-all duration-200
        ${radiusMap[radius]}
        ${selected.base}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
};
