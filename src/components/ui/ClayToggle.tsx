import React from "react";
import { motion } from "framer-motion";
import { clayTokens } from "../../tokens/clay.tokens";

export type ClayToggleVariant = "mint" | "lavender" | "peach" | "sky" | "rose";

export interface ClayToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: ClayToggleVariant;
  disabled?: boolean;
  label?: string;
  description?: string;
  id?: string;
}

export const ClayToggle: React.FC<ClayToggleProps> = ({
  checked,
  onChange,
  variant = "mint",
  disabled = false,
  label,
  description,
  id,
}) => {
  const toggleColors: Record<ClayToggleVariant, { activeTrack: string; activeGlow: string }> = {
    mint: {
      activeTrack: "bg-[#10B981] dark:bg-[#059669]",
      activeGlow: "rgba(16, 185, 129, 0.4)",
    },
    lavender: {
      activeTrack: "bg-[#6366F1] dark:bg-[#4F46E5]",
      activeGlow: "rgba(99, 102, 241, 0.4)",
    },
    peach: {
      activeTrack: "bg-[#F97316] dark:bg-[#EA580C]",
      activeGlow: "rgba(249, 115, 22, 0.4)",
    },
    sky: {
      activeTrack: "bg-[#0284C7] dark:bg-[#0369A1]",
      activeGlow: "rgba(2, 132, 199, 0.4)",
    },
    rose: {
      activeTrack: "bg-[#F43F5E] dark:bg-[#E11D48]",
      activeGlow: "rgba(244, 63, 94, 0.4)",
    },
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  const config = toggleColors[variant];

  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-3.5 select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        onClick={() => !disabled && onChange(!checked)}
        style={{
          boxShadow: checked
            ? `inset 2px 2px 5px rgba(0, 0, 0, 0.25), inset -2px -2px 4px rgba(255, 255, 255, 0.4), 0 0 12px ${config.activeGlow}`
            : undefined,
        }}
        className={`
          relative w-14 h-8 rounded-full p-1 transition-colors duration-200
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/40
          ${
            checked
              ? config.activeTrack
              : "bg-[#E2E8F3] dark:bg-[#1A1E2B] clay-sunken border border-black/5 dark:border-white/5"
          }
        `}
      >
        <motion.div
          animate={{
            x: checked ? 24 : 0,
          }}
          transition={clayTokens.animations.easing.spring}
          style={{
            boxShadow:
              "2px 4px 8px rgba(0, 0, 0, 0.16), inset 2px 2px 3px rgba(255, 255, 255, 0.95), inset -2px -2px 3px rgba(160, 175, 205, 0.3)",
          }}
          className="w-6 h-6 rounded-full bg-white dark:bg-[#F8FAFC] flex items-center justify-center pointer-events-none"
        />
      </div>

      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm font-extrabold text-[#1E2538] dark:text-[#F1F5F9]">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-[#5A6582] dark:text-[#94A3B8]">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
};
