import React, { useState } from "react";
import { ShieldCheck, KeyRound, Copy, Check, AlertTriangle, ArrowRight, Lock } from "lucide-react";
import { ClayButton, ClayCard, ClayInput } from "../ui";
import { PasswordStrengthMeter, evaluatePasswordStrength } from "./PasswordStrengthMeter";
import { tauriBridge } from "../../services/tauriBridge";

export interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState<"create_password" | "recovery_key">("create_password");

  // Form states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Recovery key states
  const [recoveryKey, setRecoveryKey] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [hasConfirmedSaved, setHasConfirmedSaved] = useState(false);

  const handleCreateMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { score } = evaluatePasswordStrength(password);
    if (score < 2) {
      setError("Please choose a stronger password before proceeding.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter carefully.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await tauriBridge.setupOnboarding(password);
      setRecoveryKey(res.recovery_key);
      setStep("recovery_key");
    } catch (err: unknown) {
      setError(typeof err === "string" ? err : "Failed to initialize master password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(recoveryKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {step === "create_password" ? (
          <ClayCard radius="xl" variant="surface" className="p-7 md:p-10 flex flex-col gap-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-[24px] bg-[#E0E7FF] dark:bg-[#312E81] text-[#3730A3] dark:text-[#E0E7FF] flex items-center justify-center shrink-0 shadow-md">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black font-display text-[#1E2538] dark:text-[#F1F5F9]">
                  Welcome to Quick Lock
                </h1>
                <p className="text-sm font-semibold text-[#5A6582] dark:text-[#94A3B8] mt-1">
                  Create a secure Master Password to protect your Windows applications.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateMasterPassword} className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <ClayInput
                  label="Master Password"
                  type="password"
                  placeholder="Enter a strong master password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <PasswordStrengthMeter password={password} />

                <ClayInput
                  label="Confirm Master Password"
                  type="password"
                  placeholder="Re-enter your password..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={error ?? undefined}
                  required
                />
              </div>

              <div className="p-4 rounded-[20px] bg-[#EEF2FF] dark:bg-[#1E2038] border border-[#C7D2FE]/60 dark:border-[#4338CA]/40 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-[#3730A3] dark:text-[#C7D2FE] leading-relaxed">
                  Your master password is protected with <strong>Argon2id</strong> cryptographic hashing and a unique random salt. It is never transmitted or stored in plain text.
                </p>
              </div>

              <ClayButton
                type="submit"
                variant="lavender"
                size="lg"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-5 h-5" />}
                className="w-full mt-2"
              >
                Create Password & Generate Key
              </ClayButton>

              {error && error.toLowerCase().includes("already onboarded") && (
                <ClayButton
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={onComplete}
                  className="w-full text-indigo-600 dark:text-indigo-400 font-bold"
                >
                  Application is already setup. Continue to Dashboard &rarr;
                </ClayButton>
              )}
            </form>
          </ClayCard>
        ) : (
          /* Step 2: One-time 24-character Recovery Key */
          <ClayCard radius="xl" variant="surface" className="p-7 md:p-10 flex flex-col gap-8 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-[24px] bg-[#FFEDD5] dark:bg-[#7C2D12] text-[#9A3412] dark:text-[#FFEDD5] flex items-center justify-center shrink-0 shadow-md">
                <KeyRound className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black font-display text-[#1E2538] dark:text-[#F1F5F9]">
                  Emergency Recovery Key
                </h1>
                <p className="text-sm font-semibold text-[#5A6582] dark:text-[#94A3B8] mt-1">
                  Save this one-time 24-character recovery key right now.
                </p>
              </div>
            </div>

            {/* Alert banner */}
            <div className="p-4 rounded-[22px] bg-[#FFF1F2] dark:bg-[#4C121A] border border-[#FECDD3] dark:border-[#BE123C]/50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-xs font-bold text-[#9F1239] dark:text-[#FDA4AF] leading-relaxed">
                <strong>Crucial Security Rule:</strong> This recovery key is shown <u>ONLY ONCE</u>. If you ever forget your master password, this key is the only way to recover access.
              </div>
            </div>

            {/* Sunken Clay Key Display */}
            <div className="p-5 md:p-6 rounded-[24px] bg-[#F4F7FC] dark:bg-[#151824] clay-sunken flex flex-col items-center gap-4 text-center">
              <span className="text-xs font-black uppercase tracking-wider text-[#8E99B5] dark:text-[#64748B]">
                Your 24-Character Recovery Key
              </span>
              <span className="font-mono text-xl md:text-2xl font-black tracking-widest text-[#1E2538] dark:text-[#F1F5F9] select-all break-all">
                {recoveryKey}
              </span>

              <ClayButton
                variant={isCopied ? "mint" : "surface"}
                size="sm"
                onClick={handleCopyKey}
                leftIcon={isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              >
                {isCopied ? "Copied to Clipboard!" : "Copy Recovery Key"}
              </ClayButton>
            </div>

            {/* Mandatory Confirmation Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none px-1">
              <input
                type="checkbox"
                checked={hasConfirmedSaved}
                onChange={(e) => setHasConfirmedSaved(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded-lg text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="text-xs font-bold text-[#5A6582] dark:text-[#94A3B8] leading-snug">
                I have safely written down or stored my 24-character recovery key in a password manager or secure location.
              </span>
            </label>

            {/* Finish Button */}
            <ClayButton
              variant="mint"
              size="lg"
              disabled={!hasConfirmedSaved}
              onClick={onComplete}
              rightIcon={<Check className="w-5 h-5" />}
              className="w-full"
            >
              Enter Quick Lock Dashboard
            </ClayButton>
          </ClayCard>
        )}
      </div>
    </div>
  );
};
