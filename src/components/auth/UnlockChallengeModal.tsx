import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, ShieldAlert, KeyRound, CheckCircle2, Clock } from "lucide-react";
import { ClayModal, ClayButton, ClayInput } from "../ui";
import { tauriBridge } from "../../services/tauriBridge";

export interface UnlockChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenRecovery: () => void;
  title?: string;
  subtitle?: string;
}

export const UnlockChallengeModal: React.FC<UnlockChallengeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenRecovery,
  title = "Quick Lock • Authentication Challenge",
  subtitle = "Enter master password to authorize this action",
}) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutSecs, setLockoutSecs] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  // Check auth state when opened
  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError(null);
      setIsSuccess(false);
      tauriBridge.getAuthStatus().then((status) => {
        setIsLockedOut(status.isLockedOut);
        setLockoutSecs(status.lockoutRemainingSeconds);
        setAttemptsRemaining(Math.max(0, 3 - status.failedAttempts));
      });
    }
  }, [isOpen]);

  // Lockout countdown timer tick
  useEffect(() => {
    if (!isLockedOut || lockoutSecs <= 0) return;
    const timer = setInterval(() => {
      setLockoutSecs((prev) => {
        if (prev <= 1) {
          setIsLockedOut(false);
          setAttemptsRemaining(3);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLockedOut, lockoutSecs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut || isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      const res = await tauriBridge.verifyMasterPassword(password);
      if (res.success) {
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      } else {
        // Trigger shake animation
        setShakeKey((k) => k + 1);
        if (res.is_locked_out) {
          setIsLockedOut(true);
          setLockoutSecs(res.lockout_remaining_secs);
          setError(`System locked out! Please wait ${res.lockout_remaining_secs} seconds.`);
        } else {
          setAttemptsRemaining(res.attempts_remaining);
          setError(`Incorrect password! Attempts remaining: ${res.attempts_remaining}`);
        }
      }
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : "Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ClayModal isOpen={isOpen} onClose={onClose} title={title} description={subtitle} maxWidth="sm">
      <motion.form
        key={shakeKey}
        animate={shakeKey > 0 ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 mt-2"
      >
        <div className="flex justify-center my-2">
          <div
            className={`w-16 h-16 rounded-[22px] flex items-center justify-center shadow-md transition-colors ${
              isSuccess
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                : isLockedOut
                ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                : "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : isLockedOut ? (
              <ShieldAlert className="w-8 h-8" />
            ) : (
              <Lock className="w-8 h-8" />
            )}
          </div>
        </div>

        {isLockedOut ? (
          <div className="p-4 rounded-[20px] bg-[#FFF1F2] dark:bg-[#4C121A] border border-[#FECDD3] dark:border-[#BE123C]/50 flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm">
              <Clock className="w-4 h-4" />
              <span>Lockout Backoff Active</span>
            </div>
            <p className="text-xs font-bold text-[#9F1239] dark:text-[#FDA4AF]">
              Repeated failures detected. You can attempt again in:
            </p>
            <span className="font-mono text-2xl font-black text-rose-600 dark:text-rose-400">
              {lockoutSecs}s
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <ClayInput
              type="password"
              placeholder="Enter master password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLockedOut || isLoading || isSuccess}
              error={error ?? undefined}
              autoFocus
            />

            <div className="flex items-center justify-between text-xs px-1 font-bold">
              <span className="text-[#8E99B5] dark:text-[#64748B]">
                Attempts left:{" "}
                <span className={attemptsRemaining <= 1 ? "text-rose-500 font-black" : "text-[#1E2538] dark:text-[#F1F5F9]"}>
                  {attemptsRemaining} / 3
                </span>
              </span>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRecovery();
                }}
                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" />
                Forgot password?
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/5 dark:border-white/5">
          <ClayButton variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </ClayButton>
          <ClayButton
            variant="mint"
            size="md"
            type="submit"
            isLoading={isLoading}
            disabled={isLockedOut || !password || isSuccess}
          >
            {isSuccess ? "Verified" : "Authorize"}
          </ClayButton>
        </div>
      </motion.form>
    </ClayModal>
  );
};
