import React, { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { OnboardingScreen } from "./components/auth/OnboardingScreen";
import { UnlockChallengeModal } from "./components/auth/UnlockChallengeModal";
import { RecoveryModal } from "./components/auth/RecoveryModal";
import { ProcessUnlockOverlay } from "./components/overlay/ProcessUnlockOverlay";
import { Dashboard } from "./components/dashboard/Dashboard";
import { tauriBridge } from "./services/tauriBridge";
import { ShieldCheck } from "lucide-react";
import { InterceptedApp } from "./types";

const isUnlockWindow = (() => {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("window") === "unlock") return true;
  try {
    return getCurrentWebviewWindow().label === "unlock-overlay";
  } catch {
    return false;
  }
})();

export const App: React.FC = () => {
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isChallengeOpen, setIsChallengeOpen] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [interceptedApp, setInterceptedApp] = useState<InterceptedApp | null>(null);
  const [authNotification, setAuthNotification] = useState<string | null>(null);

  useEffect(() => {
    if (isUnlockWindow) {
      document.documentElement.style.background = "transparent";
      document.body.style.background = "transparent";
    }
  }, []);

  const checkAuth = async () => {
    try {
      const status = await tauriBridge.getAuthStatus();
      setIsOnboarded(status.isOnboarded);
    } catch (e) {
      console.error("Failed to load auth status", e);
      setIsOnboarded(false);
    }
  };

  const checkInterceptedApp = async () => {
    try {
      const app = await tauriBridge.getInterceptedApp();
      if (app) {
        setInterceptedApp((prev) => {
          if (!prev || prev.pid !== app.pid) {
            return app;
          }
          return prev;
        });
      }
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    checkAuth();
    checkInterceptedApp();

    // Check whenever window gains focus or becomes visible
    const handleWindowActive = () => {
      checkInterceptedApp();
    };
    window.addEventListener("focus", handleWindowActive);
    window.addEventListener("visibilitychange", handleWindowActive);

    // Fast active check (every 300ms) to guarantee instant popup even if window was hidden
    const pollInterval = setInterval(() => {
      checkInterceptedApp();
    }, 300);

    let unlistenIntercepted: (() => void) | undefined;
    let unlistenTray: (() => void) | undefined;

    try {
      listen<any>("app_intercepted", (event) => {
        const payload = event.payload;
        if (payload) {
          setInterceptedApp({
            pid: payload.pid,
            name: payload.name,
            executablePath: payload.executablePath || payload.executable_path || "",
            interceptedAt: (payload.interceptedAt || payload.intercepted_at || Date.now() / 1000) * 1000,
          });
        }
      }).then((fn) => {
        unlistenIntercepted = fn;
      }).catch(() => {});

      listen("tray_lock_all", async () => {
        await tauriBridge.lockAllItems();
        setAuthNotification("🔒 All Applications and Folders are now locked via System Tray!");
        setTimeout(() => setAuthNotification(null), 4000);
      }).then((fn) => {
        unlistenTray = fn;
      }).catch(() => {});
    } catch {
      // Web preview fallback
    }

    return () => {
      window.removeEventListener("focus", handleWindowActive);
      window.removeEventListener("visibilitychange", handleWindowActive);
      clearInterval(pollInterval);
      if (unlistenIntercepted) unlistenIntercepted();
      if (unlistenTray) unlistenTray();
    };
  }, []);

  const handleResetDev = () => {
    tauriBridge.resetDevState();
    setIsOnboarded(false);
    setInterceptedApp(null);
    setAuthNotification("State reset. Launching Onboarding flow.");
    setTimeout(() => setAuthNotification(null), 3000);
  };

  const handleSimulateLaunch = async () => {
    const simulated = await tauriBridge.simulateInterceptApp(
      "Google Chrome",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    );
    setInterceptedApp(simulated);
  };

  if (isUnlockWindow) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-transparent select-none overflow-hidden p-2">
        <ProcessUnlockOverlay
          interceptedApp={interceptedApp}
          isStandaloneWindow={true}
          onUnlocked={() => {
            setInterceptedApp(null);
            tauriBridge.restoreWindowAfterUnlock(true);
          }}
          onCancelled={() => {
            setInterceptedApp(null);
            tauriBridge.restoreWindowAfterUnlock(true);
          }}
        />
      </div>
    );
  }

  if (isOnboarded === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6FC] dark:bg-[#12151F]">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isOnboarded) {
    return (
      <main className="min-h-screen bg-[#F4F6FC] dark:bg-[#12151F] transition-colors duration-200">
        <OnboardingScreen onComplete={() => setIsOnboarded(true)} />
      </main>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F4F6FC] dark:bg-[#11141F] transition-colors duration-250">
      {/* Toast Notification Banner (Floating top center) */}
      {authNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 p-3 px-5 rounded-[20px] bg-indigo-600 text-white text-xs font-black shadow-lg animate-fade-in flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <span>{authNotification}</span>
        </div>
      )}

      {/* If an intercepted app is locked, show ONLY the phone-style App Lock challenge! */}
      {interceptedApp ? (
        <ProcessUnlockOverlay
          interceptedApp={interceptedApp}
          onUnlocked={() => {
            setInterceptedApp(null);
            setAuthNotification("Application Unlocked & Resumed Successfully!");
            tauriBridge.restoreWindowAfterUnlock(true);
            setTimeout(() => setAuthNotification(null), 3500);
          }}
          onCancelled={() => {
            setInterceptedApp(null);
            setAuthNotification("Application Closed.");
            tauriBridge.restoreWindowAfterUnlock(true);
            setTimeout(() => setAuthNotification(null), 3500);
          }}
        />
      ) : (
        <Dashboard
          onOpenChallenge={() => setIsChallengeOpen(true)}
          onOpenRecovery={() => setIsRecoveryOpen(true)}
          onResetDev={handleResetDev}
          onSimulateLaunch={handleSimulateLaunch}
        />
      )}

      {/* Auth Challenge Modal */}
      <UnlockChallengeModal
        isOpen={isChallengeOpen}
        onClose={() => setIsChallengeOpen(false)}
        onSuccess={() => {
          setAuthNotification("Master Password Authenticated Successfully!");
          setTimeout(() => setAuthNotification(null), 3000);
        }}
        onOpenRecovery={() => setIsRecoveryOpen(true)}
      />

      {/* Recovery Modal */}
      <RecoveryModal
        isOpen={isRecoveryOpen}
        onClose={() => setIsRecoveryOpen(false)}
        onSuccess={() => {
          setAuthNotification("Master Password Reset via Recovery Key!");
          setTimeout(() => setAuthNotification(null), 3000);
        }}
      />
    </div>
  );
};

export default App;
