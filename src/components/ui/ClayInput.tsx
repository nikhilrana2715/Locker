import React, { useState } from "react";
import { Eye, EyeOff, X, AlertCircle } from "lucide-react";

export interface ClayInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  fullWidth?: boolean;
}

export const ClayInput = React.forwardRef<HTMLInputElement, ClayInputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      clearable = false,
      onClear,
      type = "text",
      value,
      fullWidth = true,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className={`${fullWidth ? "w-full" : "inline-block"} flex flex-col gap-1.5`}>
        {label && (
          <label className="text-xs font-black uppercase tracking-wider text-[#5A6582] dark:text-[#94A3B8] px-1">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-4 z-10 text-[#8E99B5] dark:text-[#64748B] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            type={inputType}
            value={value}
            disabled={disabled}
            style={{
              boxShadow: error
                ? "0 0 0 2px rgba(244, 63, 94, 0.4), inset 3px 3px 6px rgba(244, 63, 94, 0.15), inset -2px -2px 4px rgba(255, 255, 255, 0.8)"
                : undefined,
            }}
            className={`
              w-full h-12 rounded-full px-5 text-sm font-semibold
              bg-[#EDF2F9] dark:bg-[#161926] text-[#1E2538] dark:text-[#F1F5F9]
              clay-sunken
              placeholder:text-[#8E99B5] dark:placeholder:text-[#475569]
              border border-black/5 dark:border-white/5
              transition-all duration-200
              focus:outline-none focus:ring-4 focus:ring-indigo-300/40 dark:focus:ring-indigo-500/40
              ${leftIcon ? "pl-11" : ""}
              ${isPassword || clearable ? "pr-12" : ""}
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              ${className}
            `}
            {...props}
          />

          <div className="absolute right-3.5 flex items-center gap-1.5">
            {clearable && value && !disabled && (
              <button
                type="button"
                onClick={onClear}
                tabIndex={-1}
                aria-label="Clear input"
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#8E99B5] hover:text-[#1E2538] dark:hover:text-[#F1F5F9] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {isPassword && !disabled && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#8E99B5] hover:text-[#1E2538] dark:hover:text-[#F1F5F9] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-[#E11D48] dark:text-[#FB7185]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {helperText && !error && (
          <span className="text-xs text-[#8E99B5] dark:text-[#64748B] px-2">{helperText}</span>
        )}
      </div>
    );
  }
);

ClayInput.displayName = "ClayInput";
