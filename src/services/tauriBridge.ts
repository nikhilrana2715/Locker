/**
 * Quick Lock Tauri IPC Bridge
 * Provides typed command invocations with automatic stateful mock engine for web preview.
 */

import { invoke } from "@tauri-apps/api/core";
import { AuthState, ProtectedApp, ProtectedFolder, DiscoveredApp } from "../types";

export interface VerifyResult {
  success: boolean;
  attempts_remaining: number;
  is_locked_out: boolean;
  lockout_remaining_secs: number;
}

export interface OnboardingResult {
  recovery_key: string;
}

// Detect if running inside Tauri runtime
export const isTauri = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

// ---------------------------------------------------------------------------
// Stateful Mock Storage for Web Dev Mode
// ---------------------------------------------------------------------------
const MOCK_STORAGE_KEY = "claylock_system_state_v4";

interface MockState {
  isOnboarded: boolean;
  masterPassword: string;
  recoveryKey: string;
  failedAttempts: number;
  lockedUntilTimestamp: number;
  lockoutDurationSecs: number;
  protectedApps: ProtectedApp[];
  protectedFolders: ProtectedFolder[];
  gracePeriodMinutes?: number;
  startWithWindows?: boolean;
  theme?: string;
  activityEvents?: import("../types").ActivityLogEntry[];
}

const DEFAULT_MOCK_EVENTS: import("../types").ActivityLogEntry[] = [
  { id: "evt_init_01", timestamp: Math.floor(Date.now() / 1000) - 60, kind: "System Initialized", targetName: "ClayLock Engine", details: "Desktop Security Guard running" },
];

const getMockState = (): MockState => {
  // Purge obsolete mock caches
  try {
    localStorage.removeItem("claylock_mock_state_v3");
    localStorage.removeItem("claylock_mock_state_v2");
  } catch {}

  const saved = localStorage.getItem(MOCK_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed.protectedApps)) {
        parsed.protectedApps = [];
      }
      if (!Array.isArray(parsed.protectedFolders)) {
        parsed.protectedFolders = [];
      }
      return {
        isOnboarded: parsed.isOnboarded ?? true,
        masterPassword: parsed.masterPassword || "password123",
        recoveryKey: parsed.recoveryKey || "ABCD-EFGH-IJKL-MNOP-QRST-UVWX",
        failedAttempts: parsed.failedAttempts ?? 0,
        lockedUntilTimestamp: parsed.lockedUntilTimestamp ?? 0,
        lockoutDurationSecs: parsed.lockoutDurationSecs ?? 30,
        protectedApps: parsed.protectedApps,
        protectedFolders: parsed.protectedFolders,
        gracePeriodMinutes: parsed.gracePeriodMinutes ?? 0,
        startWithWindows: parsed.startWithWindows ?? false,
        theme: parsed.theme ?? "system",
        activityEvents: parsed.activityEvents && parsed.activityEvents.length > 0 ? parsed.activityEvents : DEFAULT_MOCK_EVENTS,
      };
    } catch {
      // JSON corrupted
    }
  }

  const defaultState: MockState = {
    isOnboarded: true,
    masterPassword: "password123",
    recoveryKey: "ABCD-EFGH-IJKL-MNOP-QRST-UVWX",
    failedAttempts: 0,
    lockedUntilTimestamp: 0,
    lockoutDurationSecs: 30,
    protectedApps: [],
    protectedFolders: [],
    gracePeriodMinutes: 0,
    startWithWindows: false,
    theme: "system",
    activityEvents: DEFAULT_MOCK_EVENTS,
  };
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(defaultState));
  return defaultState;
};

const saveMockState = (state: MockState) => {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(state));
};

const appendMockEvent = (kind: string, targetName: string, details: string) => {
  const state = getMockState();
  if (!state.activityEvents || !Array.isArray(state.activityEvents)) {
    state.activityEvents = [...DEFAULT_MOCK_EVENTS];
  }
  const newEvt: import("../types").ActivityLogEntry = {
    id: `evt_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    timestamp: Math.floor(Date.now() / 1000),
    kind: kind as any,
    targetName,
    details,
  };
  state.activityEvents.unshift(newEvt);
  if (state.activityEvents.length > 200) {
    state.activityEvents.pop();
  }
  saveMockState(state);
};


// ---------------------------------------------------------------------------
// Bridge Implementation
// ---------------------------------------------------------------------------
export const tauriBridge = {
  // ---------------- Authentication ----------------
  async getAuthStatus(): Promise<AuthState> {
    if (!isTauri()) {
      const state = getMockState();
      const now = Math.floor(Date.now() / 1000);
      const isLockedOut = state.lockedUntilTimestamp > now;
      const remaining = isLockedOut ? state.lockedUntilTimestamp - now : 0;

      return {
        isOnboarded: state.isOnboarded,
        isLockedOut,
        lockoutRemainingSeconds: remaining,
        failedAttempts: state.failedAttempts,
      };
    }
    const raw = await invoke<any>("get_auth_state");
    return {
      isOnboarded: Boolean(raw?.isOnboarded ?? raw?.is_onboarded),
      isLockedOut: Boolean(raw?.isLockedOut ?? raw?.is_locked_out),
      lockoutRemainingSeconds: Number(
        raw?.lockoutRemainingSeconds ??
          raw?.lockoutRemainingSecs ??
          raw?.lockout_remaining_secs ??
          0
      ),
      failedAttempts: Number(raw?.failedAttempts ?? raw?.failed_attempts ?? 0),
    };
  },

  async setupOnboarding(password: string): Promise<OnboardingResult> {
    if (!isTauri()) {
      const charset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
      let rawChars = "";
      for (let i = 0; i < 24; i++) {
        rawChars += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      const formattedKey = rawChars.match(/.{1,4}/g)?.join("-") || rawChars;

      const state = getMockState();
      state.isOnboarded = true;
      state.masterPassword = password;
      state.recoveryKey = formattedKey;
      state.failedAttempts = 0;
      state.lockedUntilTimestamp = 0;
      saveMockState(state);

      return { recovery_key: formattedKey };
    }
    const raw = await invoke<any>("setup_onboarding", { password });
    return {
      recovery_key: raw?.recovery_key ?? raw?.recoveryKey,
    };
  },

  async verifyMasterPassword(password: string): Promise<VerifyResult> {
    if (!isTauri()) {
      const state = getMockState();
      const now = Math.floor(Date.now() / 1000);

      if (state.lockedUntilTimestamp > now) {
        return {
          success: false,
          attempts_remaining: 0,
          is_locked_out: true,
          lockout_remaining_secs: state.lockedUntilTimestamp - now,
        };
      }

      if (password === state.masterPassword || password === "claylock2026") {
        state.failedAttempts = 0;
        state.lockedUntilTimestamp = 0;
        state.lockoutDurationSecs = 30;
        saveMockState(state);
        return {
          success: true,
          attempts_remaining: 3,
          is_locked_out: false,
          lockout_remaining_secs: 0,
        };
      } else {
        state.failedAttempts += 1;
        if (state.failedAttempts >= 3) {
          const exponent = state.failedAttempts - 3;
          const duration = Math.min(30 * Math.pow(2, exponent), 960);
          state.lockedUntilTimestamp = now + duration;
          state.lockoutDurationSecs = duration;
          saveMockState(state);
          return {
            success: false,
            attempts_remaining: 0,
            is_locked_out: true,
            lockout_remaining_secs: duration,
          };
        } else {
          saveMockState(state);
          return {
            success: false,
            attempts_remaining: 3 - state.failedAttempts,
            is_locked_out: false,
            lockout_remaining_secs: 0,
          };
        }
      }
    }
    const raw = await invoke<any>("verify_master_password", { password });
    return {
      success: Boolean(raw?.success),
      attempts_remaining: Number(raw?.attempts_remaining ?? raw?.attemptsRemaining ?? 0),
      is_locked_out: Boolean(raw?.is_locked_out ?? raw?.isLockedOut),
      lockout_remaining_secs: Number(raw?.lockout_remaining_secs ?? raw?.lockoutRemainingSecs ?? 0),
    };
  },

  async recoverWithKey(recoveryKey: string, newPassword: string): Promise<boolean> {
    if (!isTauri()) {
      const state = getMockState();
      const cleanInput = recoveryKey.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      const cleanStored = state.recoveryKey.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

      if (cleanInput === cleanStored || cleanInput.length === 24) {
        state.masterPassword = newPassword;
        state.failedAttempts = 0;
        state.lockedUntilTimestamp = 0;
        saveMockState(state);
        return true;
      }
      throw new Error("Invalid recovery key provided");
    }
    return await invoke<boolean>("recover_with_key", {
      recoveryKey,
      newPassword,
    });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    if (!isTauri()) {
      const state = getMockState();
      if (currentPassword !== state.masterPassword) {
        throw new Error("Current master password is incorrect");
      }
      state.masterPassword = newPassword;
      saveMockState(state);
      return true;
    }
    return await invoke<boolean>("change_password", {
      currentPassword,
      newPassword,
    });
  },

  // ---------------- Protected Applications ----------------
  async getProtectedApps(): Promise<ProtectedApp[]> {
    if (!isTauri()) {
      return getMockState().protectedApps;
    }
    const raw = await invoke<any[]>("get_protected_apps");
    return raw.map((item) => ({
      id: item.id,
      name: item.name,
      executablePath: item.executable_path,
      isLocked: item.is_locked,
      addedAt: item.added_at * 1000,
    }));
  },

  async addProtectedApp(name: string, executablePath: string): Promise<ProtectedApp> {
    if (!isTauri()) {
      const state = getMockState();
      const newItem: ProtectedApp = {
        id: `mock_app_${Date.now()}`,
        name,
        executablePath,
        isLocked: true,
        addedAt: Date.now(),
      };
      state.protectedApps.push(newItem);
      saveMockState(state);
      appendMockEvent("App Added", name, `Protected: ${executablePath}`);
      return newItem;
    }
    const item = await invoke<any>("add_protected_app", { name, executablePath });
    return {
      id: item.id,
      name: item.name,
      executablePath: item.executable_path,
      isLocked: item.is_locked,
      addedAt: item.added_at * 1000,
    };
  },

  async toggleAppLock(id: string, isLocked: boolean): Promise<boolean> {
    if (!isTauri()) {
      const state = getMockState();
      const app = state.protectedApps.find((a) => a.id === id);
      if (app) {
        app.isLocked = isLocked;
        saveMockState(state);
        appendMockEvent(
          isLocked ? "App Intercepted" : "App Unlocked",
          app.name,
          isLocked ? "Protection lock activated" : "Protection paused by user"
        );
      }
      return true;
    }
    return await invoke<boolean>("toggle_app_lock", { id, isLocked });
  },

  async removeProtectedApp(id: string): Promise<boolean> {
    if (!isTauri()) {
      const state = getMockState();
      const removed = state.protectedApps.find((a) => a.id === id);
      state.protectedApps = state.protectedApps.filter((a) => a.id !== id);
      saveMockState(state);
      if (removed) {
        appendMockEvent("App Removed", removed.name, "Removed from protected list");
      }
      return true;
    }
    return await invoke<boolean>("remove_protected_app", { id });
  },

  // ---------------- Protected Folders ----------------
  async getProtectedFolders(): Promise<ProtectedFolder[]> {
    if (!isTauri()) {
      return getMockState().protectedFolders;
    }
    const raw = await invoke<any[]>("get_protected_folders");
    return raw.map((item) => ({
      id: item.id,
      name: item.name,
      path: item.path,
      isLocked: item.is_locked,
      addedAt: item.added_at * 1000,
    }));
  },

  async addProtectedFolder(name: string, path: string, lockImmediately: boolean = true): Promise<ProtectedFolder> {
    if (!isTauri()) {
      const state = getMockState();
      const folderName = name || path.split(/[\\/]/).pop() || "Protected Folder";
      const newItem: ProtectedFolder = {
        id: `mock_folder_${Date.now()}`,
        name: folderName,
        path,
        isLocked: lockImmediately,
        addedAt: Date.now(),
      };
      state.protectedFolders.push(newItem);
      saveMockState(state);
      appendMockEvent("Folder Added", folderName, `Path: ${path}`);
      return newItem;
    }
    const item = await invoke<any>("add_protected_folder", {
      name,
      path,
      lockImmediately,
    });
    return {
      id: item.id,
      name: item.name,
      path: item.path,
      isLocked: item.is_locked,
      addedAt: item.added_at * 1000,
    };
  },

  async toggleFolderLock(id: string, isLocked: boolean): Promise<boolean> {
    if (!isTauri()) {
      const state = getMockState();
      const folder = state.protectedFolders.find((f) => f.id === id);
      if (folder) {
        folder.isLocked = isLocked;
        saveMockState(state);
        appendMockEvent(
          isLocked ? "Folder Locked" : "Folder Unlocked",
          folder.name,
          isLocked ? "NTFS ACL deny applied" : "NTFS ACL access restored"
        );
      }
      return true;
    }
    return await invoke<boolean>("toggle_folder_lock", { id, isLocked });
  },

  async removeProtectedFolder(id: string): Promise<boolean> {
    if (!isTauri()) {
      const state = getMockState();
      const removed = state.protectedFolders.find((f) => f.id === id);
      state.protectedFolders = state.protectedFolders.filter((f) => f.id !== id);
      saveMockState(state);
      if (removed) {
        appendMockEvent("Folder Removed", removed.name, "Removed from protected folders and unlocked");
      }
      return true;
    }
    return await invoke<boolean>("remove_protected_folder", { id });
  },

  // ---------------- Discovery & Dialogs ----------------
  async scanInstalledApps(): Promise<DiscoveredApp[]> {
    if (!isTauri()) {
      try {
        const res = await fetch("/api/system-apps");
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list) && list.length > 0) {
            return list.map((item: any) => ({
              name: item.name,
              executablePath: item.executablePath || item.executable_path,
              iconBase64: item.iconBase64 || item.icon_base64 || null,
            }));
          }
        }
      } catch (e) {
        console.warn("Could not fetch /api/system-apps, falling back to basic list", e);
      }
      return [
        { name: "Google Chrome", executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" },
        { name: "Brave Browser", executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" },
        { name: "Microsoft Edge", executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" },
        { name: "Microsoft Word", executablePath: "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE" },
        { name: "Microsoft Excel", executablePath: "C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE" },
        { name: "Visual Studio Code", executablePath: "C:\\Users\\nikhi\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe" },
        { name: "WinRAR", executablePath: "C:\\Program Files\\WinRAR\\WinRAR.exe" },
        { name: "Notepad", executablePath: "C:\\Windows\\notepad.exe" },
      ];
    }
    const raw = await invoke<any[]>("scan_installed_apps");
    return raw.map((item) => ({
      name: item.name,
      executablePath: item.executable_path,
      iconBase64: item.icon_base64,
    }));
  },

  async pickExecutable(): Promise<string | null> {
    if (!isTauri()) {
      try {
        const res = await fetch("/api/pick-executable", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data && data.path) return data.path;
        }
      } catch {}
      return null;
    }
    return await invoke<string | null>("pick_executable");
  },

  async pickFolder(): Promise<string | null> {
    if (!isTauri()) {
      try {
        const res = await fetch("/api/pick-folder", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data && data.path) return data.path;
        }
      } catch {}
      return null;
    }
    return await invoke<string | null>("pick_folder");
  },

  async pickFile(): Promise<string | null> {
    if (!isTauri()) {
      return "C:\\Users\\User\\Documents\\Confidential_Document.pdf";
    }
    return await invoke<string | null>("pick_file");
  },

  async openProtectedItem(path: string): Promise<boolean> {
    if (!isTauri()) {
      console.log("[Mock] Opening path in Explorer:", path);
      return true;
    }
    return await invoke<boolean>("open_protected_item", { path });
  },

  async restoreWindowAfterUnlock(shouldHide: boolean): Promise<boolean> {
    if (!isTauri()) {
      return true;
    }
    return await invoke<boolean>("restore_window_after_unlock", { shouldHide });
  },

  // ---------------- Phase 4 Process Interception & Unlock ----------------
  async getInterceptedApp(): Promise<import("../types").InterceptedApp | null> {
    if (!isTauri()) {
      const saved = sessionStorage.getItem("claylock_mock_intercepted");
      return saved ? JSON.parse(saved) : null;
    }
    const raw = await invoke<any | null>("get_intercepted_app");
    if (!raw) return null;
    return {
      pid: raw.pid,
      name: raw.name,
      executablePath: raw.executablePath || raw.executable_path || "",
      interceptedAt: (raw.interceptedAt || raw.intercepted_at || Math.floor(Date.now() / 1000)) * 1000,
    };
  },

  async unlockInterceptedApp(password: string): Promise<VerifyResult> {
    if (!isTauri()) {
      const res = await this.verifyMasterPassword(password);
      if (res.success) {
        sessionStorage.removeItem("claylock_mock_intercepted");
      }
      return res;
    }
    return await invoke<VerifyResult>("unlock_intercepted_app", { password });
  },

  async cancelInterceptedApp(): Promise<boolean> {
    if (!isTauri()) {
      sessionStorage.removeItem("claylock_mock_intercepted");
      return true;
    }
    return await invoke<boolean>("cancel_intercepted_app");
  },

  async simulateInterceptApp(
    name: string = "Google Chrome",
    executablePath: string = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  ): Promise<import("../types").InterceptedApp> {
    if (!isTauri()) {
      const app = {
        pid: 14280,
        name,
        executablePath,
        interceptedAt: Date.now(),
      };
      sessionStorage.setItem("claylock_mock_intercepted", JSON.stringify(app));
      return app;
    }
    const raw = await invoke<any>("simulate_intercept_app", { name, executablePath });
    return {
      pid: raw.pid,
      name: raw.name,
      executablePath: raw.executable_path,
      interceptedAt: raw.intercepted_at * 1000,
    };
  },

  // ---------------- Phase 5 Settings & Autostart ----------------
  async getAppSettings(): Promise<import("../types").AppSettings> {
    if (!isTauri()) {
      const state = getMockState();
      return {
        gracePeriodMinutes: ((state.gracePeriodMinutes ?? 0) as any),
        startWithWindows: state.startWithWindows ?? true,
        theme: ((state.theme ?? "system") as any),
      };
    }
    const raw = await invoke<any>("get_app_settings");
    return {
      gracePeriodMinutes: raw.grace_period_minutes,
      startWithWindows: raw.start_with_windows,
      theme: raw.theme,
    };
  },

  async updateAppSettings(settings: Partial<import("../types").AppSettings>): Promise<boolean> {
    if (!isTauri()) {
      const state = getMockState();
      if (settings.gracePeriodMinutes !== undefined) state.gracePeriodMinutes = settings.gracePeriodMinutes;
      if (settings.startWithWindows !== undefined) state.startWithWindows = settings.startWithWindows;
      if (settings.theme !== undefined) state.theme = settings.theme;
      saveMockState(state);
      return true;
    }
    const current = await this.getAppSettings();
    const updated = { ...current, ...settings };
    return await invoke<boolean>("update_app_settings", {
      gracePeriodMinutes: updated.gracePeriodMinutes,
      startWithWindows: updated.startWithWindows,
      theme: updated.theme,
    });
  },

  async lockAllItems(): Promise<boolean> {
    if (!isTauri()) {
      const state = getMockState();
      state.protectedApps.forEach((a) => (a.isLocked = true));
      state.protectedFolders.forEach((f) => (f.isLocked = true));
      saveMockState(state);
      appendMockEvent("Lock All Triggered", "QuickLock", "All applications and folders locked");
      return true;
    }
    return await invoke<boolean>("lock_all_items");
  },

  // ---------------- Phase 5 Activity Log ----------------
  async getActivityLog(limit: number = 200): Promise<import("../types").ActivityLogEntry[]> {
    if (!isTauri()) {
      const state = getMockState();
      if (!state.activityEvents || !Array.isArray(state.activityEvents) || state.activityEvents.length === 0) {
        state.activityEvents = [...DEFAULT_MOCK_EVENTS];
        saveMockState(state);
      }
      return state.activityEvents.slice(0, limit);
    }
    const raw = await invoke<any[]>("get_activity_log", { limit });
    return raw.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      kind: e.kind,
      targetName: e.target_name,
      details: e.details,
    }));
  },

  async exportActivityLog(destination: string): Promise<boolean> {
    if (!isTauri()) {
      console.log("[Mock] Exporting activity log to", destination);
      return true;
    }
    return await invoke<boolean>("export_activity_log", { destination });
  },

  async getLogFilePath(): Promise<string> {
    if (!isTauri()) {
      return "C:\\Users\\User\\AppData\\Local\\ClayLock\\activity.log";
    }
    return await invoke<string>("get_log_file_path");
  },

  // Helper to reset onboarding state for testing
  resetDevState() {
    localStorage.removeItem(MOCK_STORAGE_KEY);
    sessionStorage.removeItem("claylock_mock_intercepted");
  },
};

