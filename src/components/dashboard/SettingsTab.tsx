import React, { useState, useEffect } from "react";
import { ClayCard, ClayButton, ClayToggle } from "../ui";
import { AppSettings, GracePeriodMinutes } from "../../types";
import { tauriBridge } from "../../services/tauriBridge";
import {
  ShieldCheck,
  Cpu,
  Clock,
  Power,
  Lock,
  Sparkles,
  Zap,
  Check,
  Laptop,
} from "lucide-react";

interface SettingsTabProps {
  onLockAllRequested?: () => Promise<void>;
  onOpenChallenge?: () => void;
  onOpenRecovery?: () => void;
  onResetDev?: () => void;
  onSettingsSavedNotification?: (msg: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  onLockAllRequested,
  onOpenChallenge,
  onOpenRecovery,
  onResetDev,
  onSettingsSavedNotification,
}) => {
  const [settings, setSettings] = useState<AppSettings>({
    gracePeriodMinutes: 0,
    startWithWindows: true,
    theme: "system",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLockingAll, setIsLockingAll] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const loaded = await tauriBridge.getAppSettings();
        setSettings(loaded);
      } catch (e) {
        console.error("Failed to load settings", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleUpdateGracePeriod = async (minutes: GracePeriodMinutes) => {
    const updated = { ...settings, gracePeriodMinutes: minutes };
    setSettings(updated);
    try {
      await tauriBridge.updateAppSettings(updated);
      onSettingsSavedNotification?.(`Grace period updated to ${minutes === 0 ? "Instant (0m)" : `${minutes} min`}`);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleToggleAutostart = async (enabled: boolean) => {
    const updated = { ...settings, startWithWindows: enabled };
    setSettings(updated);
    try {
      await tauriBridge.updateAppSettings(updated);
      onSettingsSavedNotification?.(
        enabled ? "Windows startup enabled (starts minimized in tray)" : "Windows startup disabled"
      );
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleLockAll = async () => {
    setIsLockingAll(true);
    try {
      await tauriBridge.lockAllItems();
      if (onLockAllRequested) {
        await onLockAllRequested();
      }
      onSettingsSavedNotification?.("All applications and folders are now strictly locked!");
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLockingAll(false);
    }
  };

  const graceOptions: { value: GracePeriodMinutes; label: string; desc: string }[] = [
    { value: 0, label: "0 Min (Instant)", desc: "Lock every launch (Maximum Security)" },
    { value: 1, label: "1 Minute", desc: "Short grace for fast app restarts" },
    { value: 5, label: "5 Minutes", desc: "Balanced productivity & security" },
    { value: 15, label: "15 Minutes", desc: "Extended working session" },
  ];

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm font-semibold text-[#5A6582] dark:text-[#94A3B8]">
        <div className="w-8 h-8 mx-auto mb-3 rounded-full border-3 border-indigo-400 border-t-transparent animate-spin" />
        <span>Loading Guard Settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Low-Power Background Engine Status Banner */}
      <ClayCard
        variant="surface"
        radius="lg"
        className="p-6 relative overflow-hidden border border-emerald-200 dark:border-emerald-900/50 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-[20px] bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(160,175,205,0.4)] dark:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.06),inset_-2px_-2px_4px_rgba(0,0,0,0.6)]">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[#1E2538] dark:text-[#F1F5F9]">
                  Ultra-Low Power Background Guard
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  0.0% CPU • 0 Lag
                </span>
              </div>
              <p className="text-xs text-[#5A6582] dark:text-[#94A3B8]">
                Optimized 24/7 background interception engine engineered for zero Windows slowdown.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#E8EEF8] dark:border-[#222B3D]">
          <div className="p-3 rounded-[16px] bg-[#F1F5FB] dark:bg-[#161C2A]">
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-0.5">
              <Zap className="w-3.5 h-3.5" /> Adaptive Sleep Loop
            </p>
            <p className="text-[11px] text-[#5A6582] dark:text-[#94A3B8]">
              1.5s idle wait when no apps locked; 450ms active polling to eliminate CPU spikes.
            </p>
          </div>

          <div className="p-3 rounded-[16px] bg-[#F1F5FB] dark:bg-[#161C2A]">
            <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Zero-Syscall Filter
            </p>
            <p className="text-[11px] text-[#5A6582] dark:text-[#94A3B8]">
              Process names inspected in-memory; 99% unrelated apps discarded instantly without opening handles.
            </p>
          </div>

          <div className="p-3 rounded-[16px] bg-[#F1F5FB] dark:bg-[#161C2A]">
            <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 mb-0.5">
              <Sparkles className="w-3.5 h-3.5" /> RAM & Battery Safe
            </p>
            <p className="text-[11px] text-[#5A6582] dark:text-[#94A3B8]">
              Under 25 MB RAM consumption and 0 disk I/O during continuous background watch.
            </p>
          </div>
        </div>
      </ClayCard>

      {/* 2. Grace Period Selection Card */}
      <ClayCard variant="surface" radius="lg" className="p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-[16px] bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-[#1E2538] dark:text-[#F1F5F9]">
              Re-authentication Grace Period
            </h4>
            <p className="text-xs text-[#5A6582] dark:text-[#94A3B8]">
              How long an application remains accessible after entering your master password.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {graceOptions.map((opt) => {
            const isSelected = settings.gracePeriodMinutes === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleUpdateGracePeriod(opt.value)}
                className={`p-4 rounded-[20px] text-left transition-all relative ${
                  isSelected
                    ? "bg-white dark:bg-[#1E2538] border-2 border-indigo-500 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.8),2px_4px_10px_rgba(99,102,241,0.2)]"
                    : "bg-[#F1F5FB] dark:bg-[#161C2A] border border-transparent hover:border-[#D2DAE8] dark:hover:border-[#2A344A]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-black ${
                      isSelected
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-[#1E2538] dark:text-[#F1F5F9]"
                    }`}
                  >
                    {opt.label}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <p className="text-[11px] text-[#5A6582] dark:text-[#94A3B8] leading-tight">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </ClayCard>

      {/* 3. Windows Autostart & System Tray */}
      <ClayCard variant="surface" radius="lg" className="p-6">
        <div className="space-y-5">
          {/* Autostart Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-[16px] bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#1E2538] dark:text-[#F1F5F9]">
                  Launch on Windows Startup
                </h4>
                <p className="text-xs text-[#5A6582] dark:text-[#94A3B8]">
                  Automatically start Quick Lock in system tray when your computer boots up.
                </p>
              </div>
            </div>

            <ClayToggle
              checked={settings.startWithWindows}
              onChange={handleToggleAutostart}
              variant="lavender"
              label=""
            />
          </div>

          <div className="h-px bg-[#E8EEF8] dark:bg-[#222B3D]" />

          {/* System Tray Info */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-[16px] bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#1E2538] dark:text-[#F1F5F9]">
                  System Tray Protection Mode
                </h4>
                <p className="text-xs text-[#5A6582] dark:text-[#94A3B8]">
                  Closing the window with [X] minimizes Quick Lock to the clock tray icon.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              Active in Tray
            </span>
          </div>
        </div>
      </ClayCard>

      {/* 4. Instant Master Actions */}
      <ClayCard variant="surface" radius="lg" className="p-6">
        <h4 className="text-base font-extrabold text-[#1E2538] dark:text-[#F1F5F9] mb-1">
          Instant Security Actions
        </h4>
        <p className="text-xs text-[#5A6582] dark:text-[#94A3B8] mb-5">
          One-click tools for emergency security and testing master credentials.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <ClayButton
            variant="peach"
            size="md"
            isLoading={isLockingAll}
            onClick={handleLockAll}
            leftIcon={<Lock className="w-4 h-4" />}
          >
            Lock All Applications & Folders Now
          </ClayButton>

          {onOpenChallenge && (
            <ClayButton
              variant="lavender"
              size="md"
              onClick={onOpenChallenge}
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            >
              Verify Master Password
            </ClayButton>
          )}

          {onOpenRecovery && (
            <ClayButton
              variant="surface"
              size="md"
              onClick={onOpenRecovery}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Emergency Recovery Key
            </ClayButton>
          )}

          {onResetDev && (
            <ClayButton
              variant="surface"
              size="md"
              onClick={onResetDev}
              title="Reset state to test initial Onboarding again"
            >
              Reset Setup
            </ClayButton>
          )}
        </div>
      </ClayCard>
    </div>
  );
};
