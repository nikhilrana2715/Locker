/**
 * Quick Lock (ClayLock) TypeScript Definitions
 */

export interface ProtectedApp {
  id: string;
  name: string;
  executablePath: string;
  iconPath?: string;
  iconBase64?: string;
  isLocked: boolean;
  unlockedUntil?: number; // timestamp in ms, or null
  addedAt: number;
}

export interface ProtectedFolder {
  id: string;
  name: string;
  path: string;
  isLocked: boolean;
  unlockedUntil?: number; // timestamp in ms, or null
  addedAt: number;
}

export interface InterceptedApp {
  pid: number;
  name: string;
  executablePath: string;
  interceptedAt: number;
}

export type ProtectedItemType = "apps" | "folders" | "settings" | "activity" | "showcase";

export type GracePeriodMinutes = 0 | 1 | 5 | 15;

export interface AppSettings {
  gracePeriodMinutes: GracePeriodMinutes;
  startWithWindows: boolean;
  theme: "light" | "dark" | "system";
}

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  kind: string;
  targetName: string;
  details: string;
}

export interface AuthState {
  isOnboarded: boolean;
  isLockedOut: boolean;
  lockoutRemainingSeconds: number;
  failedAttempts: number;
}

export interface DiscoveredApp {
  name: string;
  executablePath: string;
  iconBase64?: string;
}
