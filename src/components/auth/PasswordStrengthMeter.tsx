import React from "react";
import { Check, X } from "lucide-react";
import { motion } from "framer-motion";

export interface PasswordStrengthMeterProps {
  password: string;
}

export interface PasswordCriteria {
  label: string;
  met: boolean;
}

export const evaluatePasswordStrength = (password: string): {
  score: number;
  label: string;
  criteria: PasswordCriteria[];
} => {
  const criteria: PasswordCriteria[] = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Number (0-9)", met: /[0-9]/.test(password) },
    { label: "Special symbol", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const metCount = criteria.filter((c) => c.met).length;

  let score = 0;
  let label = "Very Weak";

  if (password.length === 0) {
    score = 0;
    label = "Enter password";
  } else if (metCount <= 2 || password.length < 8) {
    score = 1;
    label = "Weak";
  } else if (metCount === 3) {
    score = 2;
    label = "Fair";
  } else if (metCount === 4) {
    score = 3;
    label = "Strong";
  } else if (metCount === 5) {
    score = 4;
    label = "Excellent (Argon2id Ready)";
  }

  return { score, label, criteria };
};

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const { score, label, criteria } = evaluatePasswordStrength(password);

  const getBarColor = (index: number) => {
    if (index >= score) return "bg-black/5 dark:bg-white/5";
    switch (score) {
      case 1:
        return "bg-rose-400 dark:bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]";
      case 2:
        return "bg-amber-400 dark:bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]";
      case 3:
        return "bg-sky-400 dark:bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.4)]";
      case 4:
        return "bg-emerald-400 dark:bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
      default:
        return "bg-black/5 dark:bg-white/5";
    }
  };

  const getLabelColor = () => {
    switch (score) {
      case 1:
        return "text-rose-500 dark:text-rose-400";
      case 2:
        return "text-amber-500 dark:text-amber-400";
      case 3:
        return "text-sky-500 dark:text-sky-400";
      case 4:
        return "text-emerald-500 dark:text-emerald-400";
      default:
        return "text-[#8E99B5] dark:text-[#64748B]";
    }
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* 4 Segmented Strength Bars */}
      <div className="flex items-center justify-between text-xs font-bold px-1">
        <span className="text-[#5A6582] dark:text-[#94A3B8]">Password Strength</span>
        <span className={`font-black ${getLabelColor()}`}>{label}</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="h-2 rounded-full overflow-hidden bg-[#E2E8F3] dark:bg-[#1A1E2B] clay-sunken p-0.5"
          >
            <motion.div
              initial={false}
              animate={{
                opacity: idx < score ? 1 : 0.3,
                scaleX: idx < score ? 1 : 0,
              }}
              className={`h-full w-full rounded-full transition-all duration-300 origin-left ${getBarColor(
                idx
              )}`}
            />
          </div>
        ))}
      </div>

      {/* Criteria Requirement Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
        {criteria.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-200 ${
              item.met
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40"
                : "bg-black/5 dark:bg-white/5 text-[#8E99B5] dark:text-[#64748B]"
            }`}
          >
            {item.met ? (
              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
            ) : (
              <X className="w-3 h-3 text-[#8E99B5] shrink-0" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
