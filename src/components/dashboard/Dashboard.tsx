import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProtectedApp, ProtectedFolder, ProtectedItemType } from "../../types";
import { tauriBridge } from "../../services/tauriBridge";
import { ClayButton, ClayInput } from "../ui";
import { AppGrid } from "./AppGrid";
import { FolderGrid } from "./FolderGrid";
import { AddAppModal } from "./AddAppModal";
import { AddFolderModal } from "./AddFolderModal";
import { SettingsTab } from "./SettingsTab";
import { ActivityLogTab } from "./ActivityLogTab";
import { UnlockChallengeModal } from "../auth/UnlockChallengeModal";
import {
  AppWindow,
  FolderLock,
  Settings,
  Search,
  Plus,
  ShieldCheck,
  Lock,
  AlertCircle,
  Cpu,
  ScrollText,
} from "lucide-react";

interface SecurityChallengeState {
  title: string;
  subtitle: string;
  action: () => Promise<void>;
}

interface DashboardProps {
  onOpenChallenge?: () => void;
  onOpenRecovery?: () => void;
  onResetDev?: () => void;
  onSimulateLaunch?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenChallenge,
  onOpenRecovery,
  onResetDev,
  onSimulateLaunch,
}) => {
  const [activeTab, setActiveTab] = useState<ProtectedItemType>("apps");
  const [apps, setApps] = useState<ProtectedApp[]>([]);
  const [installedApps, setInstalledApps] = useState<import("../../types").DiscoveredApp[]>([]);
  const [isScanningApps, setIsScanningApps] = useState(false);
  const [folders, setFolders] = useState<ProtectedFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddAppOpen, setIsAddAppOpen] = useState(false);
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLockingAll, setIsLockingAll] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [notificationType, setNotificationType] = useState<"success" | "error">("success");
  const [securityChallenge, setSecurityChallenge] = useState<SecurityChallengeState | null>(null);

  const showNotification = (msg: string, type: "success" | "error" = "success") => {
    setNotification(msg);
    setNotificationType(type);
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedApps, fetchedFolders, fetchedInstalled] = await Promise.all([
        tauriBridge.getProtectedApps(),
        tauriBridge.getProtectedFolders(),
        tauriBridge.scanInstalledApps(),
      ]);
      setApps(fetchedApps);
      setFolders(fetchedFolders);
      setInstalledApps(fetchedInstalled);
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRescanApps = async () => {
    setIsScanningApps(true);
    try {
      const scanned = await tauriBridge.scanInstalledApps();
      setInstalledApps(scanned);
      showNotification(`Discovered ${scanned.length} applications on this PC`);
    } catch (e: any) {
      showNotification("Failed to scan installed applications", "error");
    } finally {
      setIsScanningApps(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Application Handlers with Master Password Verification
  const handleToggleAppLock = async (
    id: string,
    isLocked: boolean,
    item?: { name: string; executablePath: string }
  ) => {
    if (isLocked) {
      // Activating lock
      if (id.startsWith("unprotected_") && item) {
        // App is not yet in protected list, add and lock it
        try {
          const newApp = await tauriBridge.addProtectedApp(item.name, item.executablePath);
          setApps((prev) => [...prev, newApp]);
          showNotification(`${item.name} is now locked and guarded`);
        } catch (e: any) {
          showNotification(e?.message || "Failed to protect application", "error");
        }
        return;
      }

      // Existing protected app toggle ON
      try {
        await tauriBridge.toggleAppLock(id, true);
        setApps((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isLocked: true } : a))
        );
        showNotification("Application lock activated");
      } catch (e: any) {
        showNotification(e?.message || "Failed to update lock state", "error");
      }
      return;
    }

    // Unlocking an app requires Master Password challenge
    const targetApp = apps.find((a) => a.id === id);
    const appName = targetApp ? targetApp.name : item ? item.name : "Application";
    setSecurityChallenge({
      title: `Authorize Unlock • ${appName}`,
      subtitle: `Enter Master Password to pause lock protection for ${appName}`,
      action: async () => {
        try {
          await tauriBridge.toggleAppLock(id, false);
          setApps((prev) =>
            prev.map((a) => (a.id === id ? { ...a, isLocked: false } : a))
          );
          showNotification(`${appName} protection paused`);
        } catch (e: any) {
          showNotification(e?.message || "Failed to update lock state", "error");
        }
      },
    });
  };

  const handleRemoveApp = async (id: string) => {
    const targetApp = apps.find((a) => a.id === id);
    const appName = targetApp ? targetApp.name : "Application";
    setSecurityChallenge({
      title: `Remove Protection • ${appName}`,
      subtitle: `Enter Master Password to permanently remove ${appName} from Quick Lock`,
      action: async () => {
        try {
          await tauriBridge.removeProtectedApp(id);
          setApps((prev) => prev.filter((a) => a.id !== id));
          showNotification(`${appName} removed from protected list`);
        } catch (e: any) {
          showNotification(e?.message || "Failed to remove application", "error");
        }
      },
    });
  };

  const handleAddApp = async (name: string, executablePath: string) => {
    const newApp = await tauriBridge.addProtectedApp(name, executablePath);
    setApps((prev) => [...prev, newApp]);
    showNotification(`Added and locked ${name}`);
  };

  // Folder Handlers with Master Password Verification
  const handleToggleFolderLock = async (id: string, isLocked: boolean) => {
    if (!isLocked) {
      // Unlocking a folder requires Master Password challenge
      const targetFolder = folders.find((f) => f.id === id);
      const folderName = targetFolder ? targetFolder.name : "Folder";
      setSecurityChallenge({
        title: `Authorize Folder Unlock • ${folderName}`,
        subtitle: `Enter Master Password to restore NTFS access to this directory`,
        action: async () => {
          try {
            await tauriBridge.toggleFolderLock(id, false);
            setFolders((prev) =>
              prev.map((f) => (f.id === id ? { ...f, isLocked: false } : f))
            );
            showNotification(`Folder ${folderName} unlocked (access restored)`);
          } catch (e: any) {
            showNotification(e?.message || "Failed to update folder lock", "error");
          }
        },
      });
      return;
    }

    // Locking is immediate
    try {
      await tauriBridge.toggleFolderLock(id, true);
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? { ...f, isLocked: true } : f))
      );
      showNotification("Folder locked (NTFS access denied)");
    } catch (e: any) {
      showNotification(e?.message || "Failed to update folder lock", "error");
    }
  };

  const handleRemoveFolder = async (id: string) => {
    const targetFolder = folders.find((f) => f.id === id);
    const folderName = targetFolder ? targetFolder.name : "Folder";
    setSecurityChallenge({
      title: `Remove Folder • ${folderName}`,
      subtitle: `Enter Master Password to unlock NTFS permissions and remove this folder`,
      action: async () => {
        try {
          await tauriBridge.removeProtectedFolder(id);
          setFolders((prev) => prev.filter((f) => f.id !== id));
          showNotification(`Folder ${folderName} removed from protection and unlocked`);
        } catch (e: any) {
          showNotification(e?.message || "Failed to remove folder", "error");
        }
      },
    });
  };

  const handleAddFolder = async (
    name: string,
    path: string,
    lockImmediately: boolean
  ) => {
    const newFolder = await tauriBridge.addProtectedFolder(name, path, lockImmediately);
    setFolders((prev) => [...prev, newFolder]);
    showNotification(`Added ${name} ${lockImmediately ? "(locked)" : ""}`);
  };

  const handleOpenFolderOrFile = (folder: ProtectedFolder) => {
    if (!folder.isLocked) {
      tauriBridge.openProtectedItem(folder.path);
      showNotification(`Opening ${folder.name}...`);
      return;
    }

    setSecurityChallenge({
      title: `Authorize Access • ${folder.name}`,
      subtitle: `Enter Master Password to unlock and view this protected item`,
      action: async () => {
        try {
          await tauriBridge.toggleFolderLock(folder.id, false);
          setFolders((prev) =>
            prev.map((f) => (f.id === folder.id ? { ...f, isLocked: false } : f))
          );
          await tauriBridge.openProtectedItem(folder.path);
          showNotification(`${folder.name} unlocked and opened successfully!`);
        } catch (e: any) {
          showNotification(e?.message || "Failed to unlock item", "error");
        }
      },
    });
  };

  const handleLockAll = async () => {
    setIsLockingAll(true);
    try {
      await tauriBridge.lockAllItems();
      await loadData();
      showNotification("All applications and folders are now strictly locked!");
    } catch (e: any) {
      showNotification(e?.message || "Failed to lock all items", "error");
    } finally {
      setIsLockingAll(false);
    }
  };

  const lockedAppsCount = apps.filter((a) => a.isLocked).length;
  const lockedFoldersCount = folders.filter((f) => f.isLocked).length;
  const totalLocked = lockedAppsCount + lockedFoldersCount;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F4F6FC] dark:bg-[#11141F] text-[#1E2538] dark:text-[#F1F5F9] select-none font-sans">
      {/* =========================================================================
          LEFT SIDEBAR: Native Desktop Application Chrome
      ========================================================================= */}
      <aside className="w-64 shrink-0 flex flex-col justify-between border-r border-[#E2E8F4] dark:border-[#1E2538] bg-[#FAFBFD] dark:bg-[#141824] p-4 z-20">
        <div className="space-y-6">
          {/* App Branding */}
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="w-10 h-10 rounded-[16px] bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.4),2px_4px_8px_rgba(99,102,241,0.35)] shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black tracking-tight leading-tight">
                  ClayLock
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] font-semibold text-[#5A6582] dark:text-[#94A3B8]">
                Desktop Security Guard
              </p>
            </div>
          </div>

          {/* Background Guard Live Status Pill */}
          <div className="mx-1 py-2 px-3 rounded-[16px] bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Guard Active
              </span>
            </div>
            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
              0.0% CPU
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("apps")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[18px] text-xs font-extrabold transition-all ${
                activeTab === "apps"
                  ? "bg-white dark:bg-[#1E2538] text-indigo-600 dark:text-indigo-400 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),2px_3px_8px_rgba(160,175,205,0.25)] dark:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.05),2px_3px_8px_rgba(0,0,0,0.5)] border border-[#E2E8F4] dark:border-[#2A344A]"
                  : "text-[#5A6582] dark:text-[#94A3B8] hover:text-[#1E2538] dark:hover:text-[#F1F5F9] hover:bg-[#F0F4FA] dark:hover:bg-[#1A2030]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AppWindow className="w-4 h-4" />
                <span>Protected Apps</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === "apps"
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    : "bg-[#E2E8F4] text-[#5A6582] dark:bg-[#202738] dark:text-[#94A3B8]"
                }`}
              >
                {apps.filter((a) => a.isLocked).length > 0
                  ? `${apps.filter((a) => a.isLocked).length} locked`
                  : `${installedApps.length || apps.length} apps`}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("folders")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[18px] text-xs font-extrabold transition-all ${
                activeTab === "folders"
                  ? "bg-white dark:bg-[#1E2538] text-amber-600 dark:text-amber-400 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),2px_3px_8px_rgba(160,175,205,0.25)] dark:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.05),2px_3px_8px_rgba(0,0,0,0.5)] border border-[#E2E8F4] dark:border-[#2A344A]"
                  : "text-[#5A6582] dark:text-[#94A3B8] hover:text-[#1E2538] dark:hover:text-[#F1F5F9] hover:bg-[#F0F4FA] dark:hover:bg-[#1A2030]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderLock className="w-4 h-4" />
                <span>Files & Folders</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === "folders"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-[#E2E8F4] text-[#5A6582] dark:bg-[#202738] dark:text-[#94A3B8]"
                }`}
              >
                {folders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("activity")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[18px] text-xs font-extrabold transition-all ${
                activeTab === "activity"
                  ? "bg-white dark:bg-[#1E2538] text-cyan-600 dark:text-cyan-400 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),2px_3px_8px_rgba(160,175,205,0.25)] dark:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.05),2px_3px_8px_rgba(0,0,0,0.5)] border border-[#E2E8F4] dark:border-[#2A344A]"
                  : "text-[#5A6582] dark:text-[#94A3B8] hover:text-[#1E2538] dark:hover:text-[#F1F5F9] hover:bg-[#F0F4FA] dark:hover:bg-[#1A2030]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ScrollText className="w-4 h-4" />
                <span>Activity Log</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[18px] text-xs font-extrabold transition-all ${
                activeTab === "settings"
                  ? "bg-white dark:bg-[#1E2538] text-emerald-600 dark:text-emerald-400 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.8),2px_3px_8px_rgba(160,175,205,0.25)] dark:shadow-[inset_1px_1px_2px_rgba(255,255,255,0.05),2px_3px_8px_rgba(0,0,0,0.5)] border border-[#E2E8F4] dark:border-[#2A344A]"
                  : "text-[#5A6582] dark:text-[#94A3B8] hover:text-[#1E2538] dark:hover:text-[#F1F5F9] hover:bg-[#F0F4FA] dark:hover:bg-[#1A2030]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                <span>Settings & Guard</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: Master Lock & Quick Actions */}
        <div className="space-y-3 pt-3 border-t border-[#E8EEF8] dark:border-[#1E2538]">
          {/* Quick Lock All Button */}
          <ClayButton
            variant="peach"
            size="md"
            className="w-full justify-center"
            isLoading={isLockingAll}
            onClick={handleLockAll}
            leftIcon={<Lock className="w-4 h-4" />}
          >
            Lock All Now
          </ClayButton>

          {/* Quick Status / Dev Simulation Link */}
          <div className="px-2 pt-1 flex items-center justify-between text-[11px] text-[#5A6582] dark:text-[#94A3B8]">
            <span className="flex items-center gap-1 font-semibold">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              <span>{totalLocked} items locked</span>
            </span>

            {onSimulateLaunch && (
              <button
                onClick={onSimulateLaunch}
                title="Test simulated interception challenge"
                className="hover:text-indigo-600 dark:hover:text-indigo-400 underline font-semibold cursor-pointer"
              >
                Test Lock
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MAIN APPLICATION WORKSPACE
      ========================================================================= */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Desktop Application Header Bar */}
        <header className="h-16 shrink-0 border-b border-[#E2E8F4] dark:border-[#1E2538] bg-white/70 dark:bg-[#141824]/70 backdrop-blur-md px-6 flex items-center justify-between gap-4 z-10">
          <div>
            <h2 className="text-lg font-black tracking-tight text-[#1E2538] dark:text-[#F1F5F9] leading-tight">
              {activeTab === "apps" && "Protected Applications"}
              {activeTab === "folders" && "Protected Folders"}
              {activeTab === "activity" && "Activity Log & Event Journal"}
              {activeTab === "settings" && "Guard Settings & Security"}
            </h2>
            <p className="text-xs text-[#5A6582] dark:text-[#94A3B8] hidden sm:block">
              {activeTab === "apps" && "Manage desktop applications locked with instant process suspension"}
              {activeTab === "folders" && "Manage directories secured with native Windows NTFS access denial"}
              {activeTab === "activity" && "Timestamped record of every interception, unlock, and security event"}
              {activeTab === "settings" && "Configure 24/7 background guard, Windows autostart & grace period"}
            </p>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-3">
            {/* Search Input (for apps or folders) */}
            {(activeTab === "apps" || activeTab === "folders") && (
              <div className="w-56 sm:w-64">
                <ClayInput
                  type="text"
                  placeholder={`Search ${activeTab === "apps" ? "apps" : "folders"}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                />
              </div>
            )}

            {/* Primary Action Button */}
            {activeTab === "apps" && (
              <ClayButton
                variant="lavender"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsAddAppOpen(true)}
              >
                + Protect App
              </ClayButton>
            )}

            {activeTab === "folders" && (
              <ClayButton
                variant="peach"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsAddFolderOpen(true)}
              >
                + Protect Folder
              </ClayButton>
            )}

            {activeTab === "settings" && onOpenChallenge && (
              <ClayButton
                variant="surface"
                size="md"
                leftIcon={<Lock className="w-3.5 h-3.5" />}
                onClick={onOpenChallenge}
              >
                Test Master Challenge
              </ClayButton>
            )}
          </div>
        </header>

        {/* Scrollable Workspace Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* Notification Toast Banner */}
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mb-5 p-3.5 rounded-[20px] text-xs font-bold flex items-center gap-2.5 shadow-sm max-w-2xl mx-auto ${
                  notificationType === "error"
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-200 dark:border-rose-900"
                    : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-900"
                }`}
              >
                {notificationType === "error" ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                )}
                <span>{notification}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Views */}
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-sm font-semibold text-[#5A6582] dark:text-[#94A3B8]">
              <div className="w-8 h-8 rounded-full border-3 border-indigo-400 border-t-transparent animate-spin" />
              <span>Loading protected items...</span>
            </div>
          ) : activeTab === "apps" ? (
            <div className="max-w-6xl mx-auto">
              <AppGrid
                protectedApps={apps}
                installedApps={installedApps}
                searchQuery={searchQuery}
                isScanning={isScanningApps}
                onRescan={handleRescanApps}
                onToggleLock={handleToggleAppLock}
                onRemoveApp={handleRemoveApp}
                onOpenAddModal={() => setIsAddAppOpen(true)}
              />
            </div>
          ) : activeTab === "folders" ? (
            <div className="max-w-6xl mx-auto">
              <FolderGrid
                folders={folders}
                searchQuery={searchQuery}
                onToggleLock={handleToggleFolderLock}
                onRemoveFolder={handleRemoveFolder}
                onOpenAddModal={() => setIsAddFolderOpen(true)}
                onOpenItem={handleOpenFolderOrFile}
              />
            </div>
          ) : activeTab === "activity" ? (
            <div className="max-w-5xl mx-auto">
              <ActivityLogTab
                onNotification={(msg) => showNotification(msg)}
              />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <SettingsTab
                onLockAllRequested={loadData}
                onOpenChallenge={onOpenChallenge}
                onOpenRecovery={onOpenRecovery}
                onResetDev={onResetDev}
                onSettingsSavedNotification={(msg) => showNotification(msg)}
              />
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          MODALS
      ========================================================================= */}
      <AddAppModal
        isOpen={isAddAppOpen}
        onClose={() => setIsAddAppOpen(false)}
        onAppAdded={handleAddApp}
        existingAppPaths={apps.map((a) => a.executablePath)}
      />

      <AddFolderModal
        isOpen={isAddFolderOpen}
        onClose={() => setIsAddFolderOpen(false)}
        onFolderAdded={handleAddFolder}
      />

      {/* Master Password Security Challenge Modal */}
      {securityChallenge && (
        <UnlockChallengeModal
          isOpen={true}
          title={securityChallenge.title}
          subtitle={securityChallenge.subtitle}
          onClose={() => setSecurityChallenge(null)}
          onSuccess={async () => {
            const action = securityChallenge.action;
            setSecurityChallenge(null);
            await action();
          }}
          onOpenRecovery={() => {
            setSecurityChallenge(null);
            onOpenRecovery?.();
          }}
        />
      )}
    </div>
  );
};
