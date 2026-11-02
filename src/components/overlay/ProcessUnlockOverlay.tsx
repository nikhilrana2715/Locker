import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClayCard, ClayButton, ClayInput } from "../ui";
import { InterceptedApp } from "../../types";
import { tauriBridge } from "../../services/tauriBridge";
import {
  Lock,
  Unlock,
  AlertTriangle,
  XOctagon,
  Clock,
  X,
} from "lucide-react";

interface ProcessUnlockOverlayProps {
  interceptedApp: InterceptedApp | null;
  isStandaloneWindow?: boolean;
  onUnlocked: () => void;
  onCancelled: () => void;
}

export const ProcessUnlockOverlay: React.FC<ProcessUnlockOverlayProps> = ({
  interceptedApp,
  isStandaloneWindow = false,
  onUnlocked,
  onCancelled,
}) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(3);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutSecs, setLockoutSecs] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (interceptedApp) {
      setPassword("");
      setError(null);
      setAttemptsRemaining(3);
      setIsLockedOut(false);
      setLockoutSecs(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [interceptedApp]);

  // Lockout countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLockedOut && lockoutSecs > 0) {
      timer = setInterval(() => {
        setLockoutSecs((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLockedOut, lockoutSecs]);

  if (!interceptedApp) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isLockedOut) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await tauriBridge.unlockInterceptedApp(password);

      if (res.success) {
        onUnlocked();
      } else {
        setShouldShake(true);
        setTimeout(() => setShouldShake(false), 500);

        if (res.is_locked_out) {
          setIsLockedOut(true);
          setLockoutSecs(res.lockout_remaining_secs || 30);
          setError("3 Failed attempts! Process has been terminated for system security.");
          setTimeout(() => {
            onCancelled();
          }, 3000);
        } else {
          setAttemptsRemaining(res.attempts_remaining);
          setError(
            `Incorrect Master Password. ${res.attempts_remaining} attempt${
              res.attempts_remaining === 1 ? "" : "s"
            } left before process termination.`
          );
        }
      }
    } catch (e: any) {
      setError(e?.message || "Failed to authenticate unlock challenge.");
    } finally {
      setIsSubmitting(false);
      setPassword("");
    }
  };

  const handleCancel = async () => {
    try {
      await tauriBridge.cancelInterceptedApp();
    } catch {
      // Ignored
    }
    onCancelled();
  };

  return (
    <AnimatePresence>
      <div className={`fixed inset-0 z-[100] flex items-center justify-center ${isStandaloneWindow ? "p-2 bg-transparent" : "p-4"}`}>
        {/* Full-screen Dark Frosted Backdrop (only shown when inside dashboard overlay) */}
        {!isStandaloneWindow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0B0F19]/80 backdrop-blur-md"
          />
        )}

        {/* 3D Popping Unlock Challenge Card */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 12 }}
          animate={{
            scale: 1,
            opacity: 1,
            y: 0,
            x: shouldShake ? [-12, 12, -8, 8, -4, 4, 0] : 0,
          }}
          exit={{ scale: 0.92, opacity: 0, y: 10 }}
          transition={{
            type: "spring",
            stiffness: 420,
            damping: 26,
            x: { duration: 0.4 },
          }}
          className={`relative w-full ${isStandaloneWindow ? "max-w-[440px]" : "max-w-lg"} z-10`}
        >
          <ClayCard
            radius="xl"
            variant="surface"
            className="p-6 border-2 border-slate-200/90 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.25)] rounded-[26px]"
          >
            {/* Top Status Badge & Close Button */}
            <div data-tauri-drag-region className="flex items-center justify-between mb-5 select-none cursor-grab active:cursor-grabbing">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                <Lock className="w-3.5 h-3.5" />
                Application Locked
              </span>

              <div className="flex items-center gap-2.5">
                {attemptsRemaining !== null && !isLockedOut && (
                  <span className="text-xs font-extrabold text-[#5A6582] dark:text-[#94A3B8]">
                    Attempts: <span className="text-rose-500 font-black">{attemptsRemaining}</span> / 3
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                  title="Close and cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* App Avatar & Title */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-14 h-14 rounded-[20px] bg-gradient-to-tr from-rose-100 to-pink-100 dark:from-rose-950 dark:to-pink-950 flex items-center justify-center text-rose-600 dark:text-rose-400 font-black text-2xl shrink-0 shadow-[inset_2.5px_2.5px_5px_rgba(255,255,255,0.8),inset_-2.5px_-2.5px_5px_rgba(244,63,94,0.3)]">
                {interceptedApp.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <h3 className="text-xl font-black text-[#1E2538] dark:text-[#F1F5F9] leading-tight">
                  Unlock {interceptedApp.name}
                </h3>
                <p className="text-xs text-[#5A6582] dark:text-[#94A3B8] mt-0.5">
                  Enter your Master Password to open {interceptedApp.name}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password Input */}
              <ClayInput
                ref={inputRef}
                label="Enter Master Password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLockedOut || isSubmitting}
                required
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              />

              {/* Error / Alert banner */}
              {error && (
                <div
                  className={`p-3.5 rounded-[18px] text-xs font-bold flex items-center gap-2.5 ${
                    isLockedOut
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-800"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Lockout countdown */}
              {isLockedOut && (
                <div className="p-3.5 rounded-[18px] bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 flex items-center justify-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Security Lockout: {lockoutSecs}s remaining</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3">
                <ClayButton
                  type="button"
                  variant="surface"
                  size="md"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  leftIcon={<XOctagon className="w-4 h-4 text-rose-500" />}
                >
                  Cancel & Close
                </ClayButton>

                <ClayButton
                  type="submit"
                  variant="lavender"
                  size="md"
                  isLoading={isSubmitting}
                  disabled={!password || isLockedOut}
                  leftIcon={<Unlock className="w-4 h-4" />}
                >
                  Unlock & Open
                </ClayButton>
              </div>
            </form>
          </ClayCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
