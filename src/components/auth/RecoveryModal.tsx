import React, { useState } from "react";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { ClayModal, ClayButton, ClayInput } from "../ui";
import { PasswordStrengthMeter, evaluatePasswordStrength } from "./PasswordStrengthMeter";
import { tauriBridge } from "../../services/tauriBridge";

export interface RecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecoveryModal: React.FC<RecoveryModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [keyInput, setKeyInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Format recovery key automatically with hyphens (groups of 4)
  const handleKeyChange = (val: string) => {
    // Strip hyphens and spaces
    const clean = val.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const chunks = clean.match(/.{1,4}/g);
    setKeyInput(chunks ? chunks.join("-").slice(0, 29) : clean);
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (keyInput.replace(/-/g, "").length < 24) {
      setError("Please enter the complete 24-character recovery key.");
      return;
    }

    const { score } = evaluatePasswordStrength(newPassword);
    if (score < 2) {
      setError("Please choose a stronger new master password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await tauriBridge.recoverWithKey(keyInput, newPassword);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : "Invalid recovery key or recovery failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ClayModal
      isOpen={isOpen}
      onClose={onClose}
      title="Master Password Recovery"
      description="Enter your 24-character emergency recovery key to set a new password."
      maxWidth="md"
    >
      {isSuccess ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="w-16 h-16 rounded-[22px] bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center shadow-md">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h4 className="text-xl font-black text-[#1E2538] dark:text-[#F1F5F9]">
            Access Successfully Recovered!
          </h4>
          <p className="text-sm font-semibold text-[#5A6582] dark:text-[#94A3B8]">
            Your new master password has been encrypted and applied.
          </p>
        </div>
      ) : (
        <form onSubmit={handleRecover} className="flex flex-col gap-5 mt-2">
          <ClayInput
            label="24-Character Recovery Key"
            placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
            value={keyInput}
            onChange={(e) => handleKeyChange(e.target.value)}
            leftIcon={<KeyRound className="w-4 h-4" />}
            required
          />

          <div className="flex flex-col gap-3">
            <ClayInput
              label="New Master Password"
              type="password"
              placeholder="Enter new master password..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <PasswordStrengthMeter password={newPassword} />

            <ClayInput
              label="Confirm New Password"
              type="password"
              placeholder="Re-enter new password..."
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={error ?? undefined}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/5 dark:border-white/5">
            <ClayButton variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </ClayButton>
            <ClayButton variant="mint" size="md" type="submit" isLoading={isLoading}>
              Reset & Unlock
            </ClayButton>
          </div>
        </form>
      )}
    </ClayModal>
  );
};
