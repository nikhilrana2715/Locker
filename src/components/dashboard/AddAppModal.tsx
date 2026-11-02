import React, { useState, useEffect } from "react";
import { ClayModal, ClayButton, ClayInput, AppIcon } from "../ui";
import { DiscoveredApp } from "../../types";
import { tauriBridge } from "../../services/tauriBridge";
import {
  Search,
  FolderOpen,
  Lock,
  Check,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

const getAppCategory = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes("chrome") || lower.includes("brave") || lower.includes("edge") || lower.includes("firefox")) return "Browser";
  if (lower.includes("steam") || lower.includes("epic") || lower.includes("game")) return "Gaming";
  if (lower.includes("discord") || lower.includes("telegram") || lower.includes("slack")) return "Communication";
  if (lower.includes("code") || lower.includes("terminal") || lower.includes("git")) return "Developer";
  if (lower.includes("word") || lower.includes("excel") || lower.includes("powerpoint") || lower.includes("office") || lower.includes("notepad")) return "Productivity";
  if (lower.includes("spotify") || lower.includes("vlc")) return "Media";
  return "Desktop App";
};

interface AddAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppAdded: (name: string, executablePath: string) => Promise<void>;
  existingAppPaths?: string[];
}

export const AddAppModal: React.FC<AddAppModalProps> = ({
  isOpen,
  onClose,
  onAppAdded,
  existingAppPaths = [],
}) => {
  const [discoveredApps, setDiscoveredApps] = useState<DiscoveredApp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lockingAppPath, setLockingAppPath] = useState<string | null>(null);
  const [justLockedPaths, setJustLockedPaths] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadDiscoveredApps = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apps = await tauriBridge.scanInstalledApps();
      setDiscoveredApps(apps);
    } catch (e: any) {
      setError("Unable to auto-detect installed apps. You can browse from PC below.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setError(null);
      setJustLockedPaths(new Set());
      loadDiscoveredApps();
    }
  }, [isOpen]);

  // One-click lock action for any detected application!
  const handleDirectLock = async (app: DiscoveredApp) => {
    setLockingAppPath(app.executablePath);
    setError(null);
    try {
      await onAppAdded(app.name, app.executablePath);
      setJustLockedPaths((prev) => new Set(prev).add(app.executablePath));
    } catch (e: any) {
      setError(e?.message || "Failed to lock application.");
    } finally {
      setLockingAppPath(null);
    }
  };

  // Browse directly from computer without typing any path!
  const handleBrowseExe = async () => {
    setError(null);
    try {
      const pickedPath = await tauriBridge.pickExecutable();
      if (pickedPath) {
        const fileName = pickedPath.split(/[\\/]/).pop() || "Application";
        const nameWithoutExt = fileName.replace(/\.exe$/i, "");
        await onAppAdded(nameWithoutExt, pickedPath);
        onClose();
      }
    } catch (e: any) {
      setError(e?.message || "Failed to select application.");
    }
  };

  const filteredDiscovered = discoveredApps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ClayModal
      isOpen={isOpen}
      onClose={onClose}
      title="Protect Application"
      description="Select any application from your PC to enable lock protection immediately."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ClayInput
              type="text"
              placeholder="Search installed applications (Chrome, Discord, Steam...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <ClayButton
            type="button"
            variant="surface"
            size="md"
            onClick={loadDiscoveredApps}
            title="Rescan PC for newly installed apps"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-500" : ""}`} />
          </ClayButton>
        </div>

        {/* Error notification if any */}
        {error && (
          <div className="p-3.5 rounded-[16px] bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900 flex items-center gap-2.5 text-xs font-bold text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* List of Applications with Direct One-Click Lock Action */}
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {isLoading ? (
            <div className="p-12 text-center text-sm font-semibold text-[#5A6582] dark:text-[#94A3B8] flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-3 border-indigo-400 border-t-transparent animate-spin" />
              <span>Scanning applications on your PC...</span>
            </div>
          ) : filteredDiscovered.length === 0 ? (
            <div className="p-10 text-center text-sm font-semibold text-[#5A6582] dark:text-[#94A3B8]">
              No applications match "{searchQuery}". You can browse any .exe directly from your computer below.
            </div>
          ) : (
            filteredDiscovered.map((app, index) => {
              const isAlreadyLocked =
                existingAppPaths.includes(app.executablePath) ||
                justLockedPaths.has(app.executablePath);
              const isProcessing = lockingAppPath === app.executablePath;

              return (
                <div
                  key={index}
                  className="p-3.5 rounded-[20px] bg-white dark:bg-[#1E2538] border border-[#E8EEF8] dark:border-[#2A344A] flex items-center justify-between gap-4 hover:shadow-sm transition-all"
                >
                  {/* Left: App Icon + App Name */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <AppIcon
                      name={app.name}
                      iconBase64={app.iconBase64}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-extrabold text-[#1E2538] dark:text-[#F1F5F9] truncate">
                          {app.name}
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {getAppCategory(app.name)}
                        </span>
                      </div>
                      <p className="text-xs text-[#5A6582] dark:text-[#94A3B8] font-mono truncate">
                        {app.executablePath ? app.executablePath.split(/[\\/]/).pop() : "app.exe"}
                      </p>
                    </div>
                  </div>

                  {/* Right: Direct Lock Action Button */}
                  <div>
                    {isAlreadyLocked ? (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <Check className="w-3.5 h-3.5" />
                        Locked
                      </span>
                    ) : (
                      <ClayButton
                        type="button"
                        variant="lavender"
                        size="sm"
                        isLoading={isProcessing}
                        onClick={() => handleDirectLock(app)}
                        leftIcon={<Lock className="w-3.5 h-3.5" />}
                      >
                        Lock App
                      </ClayButton>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Bar: Browse other apps without typing + Done button */}
        <div className="pt-3 border-t border-[#E8EEF8] dark:border-[#222B3D] flex items-center justify-between gap-3">
          <ClayButton
            type="button"
            variant="surface"
            size="sm"
            onClick={handleBrowseExe}
            leftIcon={<FolderOpen className="w-4 h-4 text-indigo-500" />}
          >
            Browse other app from PC
          </ClayButton>

          <ClayButton
            type="button"
            variant="lavender"
            size="md"
            onClick={onClose}
          >
            Done
          </ClayButton>
        </div>
      </div>
    </ClayModal>
  );
};
