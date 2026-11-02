import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { clayTokens } from "../../tokens/clay.tokens";

export type ClayButtonVariant = "lavender" | "peach" | "mint" | "sky" | "rose" | "surface" | "ghost";
export type ClayButtonSize = "sm" | "md" | "lg";

export interface ClayButtonProps extends Omit<HTMLMotionProps<"button">, "size"> {
  variant?: ClayButtonVariant;
  size?: ClayButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const ClayButton: React.FC<ClayButtonProps> = ({
  variant = "lavender",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled = false,
  className = "",
  children,
  ...props
}) => {
  // Variant specific clay styles (outer soft drop + dual inset bevel)
  const variantStyles: Record<ClayButtonVariant, { base: string; style: React.CSSProperties }> = {
    lavender: {
      base: "bg-[#E0E7FF] dark:bg-[#312E81] text-[#3730A3] dark:text-[#E0E7FF] border border-[#C7D2FE]/60 dark:border-[#4338CA]/60",
      style: {
        boxShadow:
          "5px 10px 18px rgba(99, 102, 241, 0.18), inset 2px 2px 4px rgba(255, 255, 255, 0.95), inset -3px -3px 6px rgba(79, 70, 229, 0.22)",
      },
    },
    peach: {
      base: "bg-[#FFEDD5] dark:bg-[#7C2D12] text-[#9A3412] dark:text-[#FFEDD5] border border-[#FED7AA]/60 dark:border-[#9A3412]/60",
      style: {
        boxShadow:
          "5px 10px 18px rgba(249, 115, 22, 0.18), inset 2px 2px 4px rgba(255, 255, 255, 0.95), inset -3px -3px 6px rgba(234, 88, 12, 0.22)",
      },
    },
    mint: {
      base: "bg-[#D1FAE5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#D1FAE5] border border-[#A7F3D0]/60 dark:border-[#047857]/60",
      style: {
        boxShadow:
          "5px 10px 18px rgba(16, 185, 129, 0.18), inset 2px 2px 4px rgba(255, 255, 255, 0.95), inset -3px -3px 6px rgba(5, 150, 105, 0.22)",
      },
    },
    sky: {
      base: "bg-[#E0F2FE] dark:bg-[#0C4A6E] text-[#075985] dark:text-[#E0F2FE] border border-[#BAE6FD]/60 dark:border-[#0284C7]/60",
      style: {
        boxShadow:
          "5px 10px 18px rgba(14, 165, 233, 0.18), inset 2px 2px 4px rgba(255, 255, 255, 0.95), inset -3px -3px 6px rgba(2, 132, 199, 0.22)",
      },
    },
    rose: {
      base: "bg-[#FFE4E6] dark:bg-[#881337] text-[#9F1239] dark:text-[#FFE4E6] border border-[#FECDD3]/60 dark:border-[#BE123C]/60",
      style: {
        boxShadow:
          "5px 10px 18px rgba(244, 63, 94, 0.18), inset 2px 2px 4px rgba(255, 255, 255, 0.95), inset -3px -3px 6px rgba(225, 29, 72, 0.22)",
      },
    },
    surface: {
      base: "bg-white dark:bg-[#252A3D] text-[#1E2538] dark:text-[#F1F5F9] border border-white/80 dark:border-white/10",
      style: {
        boxShadow:
          "6px 12px 20px rgba(120, 135, 175, 0.16), inset 2px 2px 4px rgba(255, 255, 255, 0.95), inset -3px -3px 6px rgba(160, 175, 205, 0.22)",
      },
    },
    ghost: {
      base: "bg-transparent text-[#5A6582] dark:text-[#A0AEC0] hover:bg-black/5 dark:hover:bg-white/5",
      style: {},
    },
  };

  const sizeClasses: Record<ClayButtonSize, string> = {
    sm: "h-9 px-4 text-xs font-bold gap-1.5",
    md: "h-11 px-6 text-sm font-extrabold gap-2",
    lg: "h-14 px-8 text-base font-extrabold gap-2.5",
  };

  const currentVariant = variantStyles[variant];

  return (
    <motion.button
      whileHover={
        disabled || isLoading
          ? undefined
          : {
              scale: 1.02,
              transition: { duration: clayTokens.animations.duration.normal / 1000 },
            }
      }
      whileTap={
        disabled || isLoading
          ? undefined
          : {
              scale: clayTokens.animations.pressScale,
              transition: { duration: clayTokens.animations.duration.fast / 1000, ease: clayTokens.animations.easing.clayPress },
            }
      }
      disabled={disabled || isLoading}
      style={currentVariant.style}
      className={`
        relative inline-flex items-center justify-center
        rounded-full cursor-pointer select-none tracking-wide font-sans
        transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/40 dark:focus-visible:ring-indigo-500/50
        ${currentVariant.base}
        ${sizeClasses[size]}
        ${disabled ? "opacity-50 cursor-not-allowed saturate-50 shadow-none" : "active:shadow-inner"}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {leftIcon && <span className="flex items-center">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="flex items-center">{rightIcon}</span>}
        </>
      )}
    </motion.button>
  );
};
