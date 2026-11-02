import React, { useState } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Sun,
  Moon,
  Sparkles,
  Layers,
  FolderOpen,
  Plus,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import {
  ClayButton,
  ClayCard,
  ClayInput,
  ClayToggle,
  ClayModal,
} from "../ui";

export const ComponentShowcase: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [toggleStateMint, setToggleStateMint] = useState(true);
  const [toggleStateLavender, setToggleStateLavender] = useState(true);
  const [toggleStatePeach, setToggleStatePeach] = useState(false);
  const [toggleStateSky, setToggleStateSky] = useState(true);

  // Button interactive states
  const [isBtnLoading, setIsBtnLoading] = useState(false);
  const [clickCounter, setClickCounter] = useState(0);

  // Input states
  const [sampleText, setSampleText] = useState("C:\\Program Files\\Google\\Chrome\\chrome.exe");
  const [samplePassword, setSamplePassword] = useState("clay-master-pwd-2026");
  const [inputError, setInputError] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockAttempts, setUnlockAttempts] = useState(3);
  const [unlockFeedback, setUnlockFeedback] = useState<string | null>(null);

  // Simulated protected apps
  const [apps, setApps] = useState([
    {
      id: "1",
      name: "Google Chrome",
      path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      isLocked: true,
      color: "sky" as const,
    },
    {
      id: "2",
      name: "Discord",
      path: "C:\\Users\\User\\AppData\\Local\\Discord\\app-1.0.9015\\Discord.exe",
      isLocked: true,
      color: "lavender" as const,
    },
    {
      id: "3",
      name: "Steam Client",
      path: "C:\\Program Files (x86)\\Steam\\steam.exe",
      isLocked: false,
      color: "peach" as const,
    },
    {
      id: "4",
      name: "Visual Studio Code",
      path: "C:\\Program Files\\Microsoft VS Code\\Code.exe",
      isLocked: true,
      color: "mint" as const,
    },
  ]);

  const toggleTheme = (val: boolean) => {
    setIsDark(val);
    if (val) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleTestUnlock = () => {
    if (unlockPassword === "pass123") {
      setUnlockFeedback("success");
      setTimeout(() => {
        setIsUnlockModalOpen(false);
        setUnlockFeedback(null);
        setUnlockPassword("");
        setUnlockAttempts(3);
      }, 1000);
    } else {
      setUnlockAttempts((prev) => Math.max(0, prev - 1));
      setUnlockFeedback("wrong");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-10">
      {/* Top Banner Header */}
      <ClayCard
        radius="xl"
        variant="surface"
        className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[22px] bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-md">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight text-[#1E2538] dark:text-[#F1F5F9]">
                Quick Lock
              </h1>
              <span className="text-xs font-black uppercase px-2.5 py-1 rounded-full bg-[#E0E7FF] dark:bg-[#312E81] text-[#3730A3] dark:text-[#C7D2FE]">
                Phase 1 • Claymorphism
              </span>
            </div>
            <p className="text-sm font-medium text-[#5A6582] dark:text-[#94A3B8] mt-1">
              Tactile, puffy 3D desktop security design system with dual inset bevels & soft pastels.
            </p>
          </div>
        </div>

        {/* Theme & Controls Header */}
        <div className="flex items-center gap-4 bg-[#EDF2F9] dark:bg-[#161926] p-2.5 rounded-full clay-sunken">
          <Sun className="w-4 h-4 text-amber-500" />
          <ClayToggle
            checked={isDark}
            onChange={toggleTheme}
            variant="lavender"
            aria-label="Toggle Dark Mode"
          />
          <Moon className="w-4 h-4 text-indigo-400" />
        </div>
      </ClayCard>

      {/* Section 1: Color Tokens & Pastels */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2 px-1">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-black text-[#1E2538] dark:text-[#F1F5F9]">
            Pastel Color System (WCAG AA Compliant)
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <ClayCard radius="lg" variant="lavender" hoverLift className="p-4 flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-wider opacity-80">Lavender</span>
            <span className="text-xl font-black">#E0E7FF</span>
            <span className="text-xs font-semibold">Primary Accent & Modals</span>
          </ClayCard>

          <ClayCard radius="lg" variant="peach" hoverLift className="p-4 flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-wider opacity-80">Peach</span>
            <span className="text-xl font-black">#FFEDD5</span>
            <span className="text-xs font-semibold">Warning & Sessions</span>
          </ClayCard>

          <ClayCard radius="lg" variant="mint" hoverLift className="p-4 flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-wider opacity-80">Mint</span>
            <span className="text-xl font-black">#D1FAE5</span>
            <span className="text-xs font-semibold">Active & Unlocked</span>
          </ClayCard>

          <ClayCard radius="lg" variant="sky" hoverLift className="p-4 flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-wider opacity-80">Sky</span>
            <span className="text-xl font-black">#E0F2FE</span>
            <span className="text-xs font-semibold">App Discovery & Info</span>
          </ClayCard>

          <ClayCard radius="lg" variant="surface" hoverLift className="p-4 flex flex-col gap-2">
            <span className="text-xs font-black uppercase tracking-wider opacity-80">Rose</span>
            <span className="text-xl font-black text-rose-600 dark:text-rose-400">#FFE4E6</span>
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">Lockout & Termination</span>
          </ClayCard>
        </div>
      </section>

      {/* Section 2: Clay Buttons */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-black text-[#1E2538] dark:text-[#F1F5F9]">
              Clay Buttons (Scale 0.97 Press In & Deepened Inset)
            </h2>
          </div>
          <span className="text-xs font-extrabold text-[#5A6582] dark:text-[#94A3B8]">
            Clicks Registered: {clickCounter}
          </span>
        </div>

        <ClayCard radius="xl" variant="surface" className="p-6 md:p-8 flex flex-col gap-6">
          {/* Button Variants Row */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#8E99B5] dark:text-[#64748B] mb-3">
              Color Variants
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <ClayButton
                variant="lavender"
                onClick={() => setClickCounter((c) => c + 1)}
                leftIcon={<Lock className="w-4 h-4" />}
              >
                Lavender Action
              </ClayButton>

              <ClayButton
                variant="peach"
                onClick={() => setClickCounter((c) => c + 1)}
                leftIcon={<KeyRound className="w-4 h-4" />}
              >
                Peach Warning
              </ClayButton>

              <ClayButton
                variant="mint"
                onClick={() => setClickCounter((c) => c + 1)}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Mint Success
              </ClayButton>

              <ClayButton
                variant="sky"
                onClick={() => setClickCounter((c) => c + 1)}
                leftIcon={<FolderOpen className="w-4 h-4" />}
              >
                Sky Discover
              </ClayButton>

              <ClayButton
                variant="rose"
                onClick={() => setClickCounter((c) => c + 1)}
                leftIcon={<ShieldAlert className="w-4 h-4" />}
              >
                Rose Terminate
              </ClayButton>

              <ClayButton
                variant="surface"
                onClick={() => setClickCounter((c) => c + 1)}
              >
                Surface Default
              </ClayButton>
            </div>
          </div>

          {/* Sizes & Interactive States */}
          <div className="pt-4 border-t border-black/5 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#8E99B5] dark:text-[#64748B]">
                Button Sizes
              </h3>
              <div className="flex items-center gap-3">
                <ClayButton variant="lavender" size="sm">Small</ClayButton>
                <ClayButton variant="lavender" size="md">Medium</ClayButton>
                <ClayButton variant="lavender" size="lg">Large</ClayButton>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#8E99B5] dark:text-[#64748B]">
                Dynamic States
              </h3>
              <div className="flex items-center gap-3">
                <ClayButton
                  variant="mint"
                  isLoading={isBtnLoading}
                  onClick={() => {
                    setIsBtnLoading(true);
                    setTimeout(() => setIsBtnLoading(false), 1500);
                  }}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  {isBtnLoading ? "Saving..." : "Click for Loading"}
                </ClayButton>

                <ClayButton variant="surface" disabled>
                  Disabled
                </ClayButton>
              </div>
            </div>
          </div>
        </ClayCard>
      </section>

      {/* Section 3: Clay Inputs & Form Controls */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2 px-1">
          <Sliders className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-black text-[#1E2538] dark:text-[#F1F5F9]">
            Clay Form Controls (Sunken 3D Surfaces & Toggles)
          </h2>
        </div>

        <ClayCard radius="xl" variant="surface" className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Inputs Column */}
          <div className="flex flex-col gap-5">
            <ClayInput
              label="Executable Path"
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              clearable
              onClear={() => setSampleText("")}
              helperText="Target application binary detected on system"
            />

            <ClayInput
              label="Master Password Field (With Show/Hide Toggle)"
              type="password"
              value={samplePassword}
              onChange={(e) => setSamplePassword(e.target.value)}
              helperText="Encrypted via Argon2id with random salt"
            />

            <div>
              <ClayInput
                label="Error State Input"
                value="InvalidKey#123"
                error={inputError || "24-character recovery key format incorrect"}
                onChange={(e) => setInputError(e.target.value ? "" : "Field cannot be empty")}
              />
            </div>
          </div>

          {/* Toggles Column */}
          <div className="flex flex-col gap-6 justify-center bg-[#F7F9FD] dark:bg-[#171A27] p-6 rounded-[24px] clay-sunken">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#8E99B5] dark:text-[#64748B]">
              Tactile Clay Spring Toggles
            </h3>

            <div className="flex flex-col gap-4">
              <ClayToggle
                checked={toggleStateMint}
                onChange={setToggleStateMint}
                variant="mint"
                label="Background WMI Process Watcher"
                description="Subscribes to Win32_ProcessStartTrace events"
              />

              <ClayToggle
                checked={toggleStateLavender}
                onChange={setToggleStateLavender}
                variant="lavender"
                label="Launch Unlock Overlay Always-on-Top"
                description="Hides application window until verified"
              />

              <ClayToggle
                checked={toggleStatePeach}
                onChange={setToggleStatePeach}
                variant="peach"
                label="Grace Period Active (5 Minutes)"
                description="Avoid repeating master password prompts"
              />

              <ClayToggle
                checked={toggleStateSky}
                onChange={setToggleStateSky}
                variant="sky"
                label="Windows Autostart Enabled"
                description="Protects sensitive programs immediately upon login"
              />
            </div>
          </div>
        </ClayCard>
      </section>

      {/* Section 4: Mock Dashboard & Protected App Grid */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-black text-[#1E2538] dark:text-[#F1F5F9]">
              Application Grid Preview (Dashboard Mockup)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <ClayButton
              variant="lavender"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsModalOpen(true)}
            >
              Add App Modal
            </ClayButton>
            <ClayButton
              variant="peach"
              size="sm"
              leftIcon={<KeyRound className="w-3.5 h-3.5" />}
              onClick={() => setIsUnlockModalOpen(true)}
            >
              Test Unlock Overlay
            </ClayButton>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {apps.map((app) => (
            <ClayCard
              key={app.id}
              radius="lg"
              variant={app.isLocked ? "surface" : "sunken"}
              hoverLift
              className="p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-[18px] bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black shadow-sm">
                  {app.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex items-center">
                  <ClayToggle
                    checked={app.isLocked}
                    onChange={(checked) => {
                      setApps(apps.map((a) => (a.id === app.id ? { ...a, isLocked: checked } : a)));
                    }}
                    variant={app.color}
                  />
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-[#1E2538] dark:text-[#F1F5F9] text-base truncate">
                  {app.name}
                </h4>
                <p className="text-xs text-[#8E99B5] dark:text-[#64748B] truncate mt-0.5" title={app.path}>
                  {app.path}
                </p>
              </div>

              <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs font-bold">
                <span
                  className={
                    app.isLocked
                      ? "text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
                      : "text-slate-400 dark:text-slate-500 flex items-center gap-1"
                  }
                >
                  {app.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  {app.isLocked ? "Protected" : "Unrestricted"}
                </span>
                <span className="text-[10px] text-[#8E99B5] dark:text-[#64748B]">NtSuspend</span>
              </div>
            </ClayCard>
          ))}
        </div>
      </section>

      {/* Modal 1: Add App Discovery Modal */}
      <ClayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Application to Quick Lock"
        description="Select an application detected on your system or browse for an executable."
        maxWidth="md"
      >
        <div className="flex flex-col gap-4">
          <ClayInput
            label="Search Installed Apps"
            placeholder="Search by name or path..."
            leftIcon={<Sparkles className="w-4 h-4" />}
          />

          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            <div className="p-3 rounded-[18px] bg-[#F7F9FD] dark:bg-[#161926] clay-sunken flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#1E2538] dark:text-[#F1F5F9]">Spotify.exe</p>
                <p className="text-xs text-[#8E99B5]">C:\Users\User\AppData\Roaming\Spotify\Spotify.exe</p>
              </div>
              <ClayButton variant="lavender" size="sm">Select</ClayButton>
            </div>
            <div className="p-3 rounded-[18px] bg-[#F7F9FD] dark:bg-[#161926] clay-sunken flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#1E2538] dark:text-[#F1F5F9]">Telegram.exe</p>
                <p className="text-xs text-[#8E99B5]">C:\Users\User\AppData\Roaming\Telegram Desktop\Telegram.exe</p>
              </div>
              <ClayButton variant="lavender" size="sm">Select</ClayButton>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-black/5 dark:border-white/5">
            <ClayButton
              variant="sky"
              size="sm"
              leftIcon={<FolderOpen className="w-3.5 h-3.5" />}
              onClick={() => alert("Browse executable dialog triggered")}
            >
              Browse .exe...
            </ClayButton>
            <ClayButton variant="lavender" onClick={() => setIsModalOpen(false)}>
              Done
            </ClayButton>
          </div>
        </div>
      </ClayModal>

      {/* Modal 2: Simulated Unlock Overlay */}
      <ClayModal
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        title="Quick Lock • Security Challenge"
        description="Application suspended. Enter master password to resume."
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4 items-center text-center">
          <div className="w-16 h-16 rounded-[22px] bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-md">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h4 className="text-base font-extrabold text-[#1E2538] dark:text-[#F1F5F9]">
              Google Chrome
            </h4>
            <p className="text-xs text-[#5A6582] dark:text-[#94A3B8]">
              Attempts Remaining: <span className="font-black text-rose-500">{unlockAttempts}</span>
            </p>
          </div>

          <ClayInput
            type="password"
            placeholder="Enter master password (try: pass123)"
            value={unlockPassword}
            onChange={(e) => setUnlockPassword(e.target.value)}
            error={unlockFeedback === "wrong" ? "Incorrect password! Process will terminate at 0." : undefined}
          />

          {unlockFeedback === "success" && (
            <div className="text-xs font-black text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Password Verified! Resuming process...
            </div>
          )}

          <div className="flex items-center gap-3 w-full justify-between pt-2">
            <ClayButton
              variant="rose"
              size="sm"
              onClick={() => {
                setIsUnlockModalOpen(false);
                alert("Process Terminated (Cancelled by User)");
              }}
            >
              Cancel & Terminate
            </ClayButton>
            <ClayButton
              variant="mint"
              size="sm"
              onClick={handleTestUnlock}
            >
              Unlock App
            </ClayButton>
          </div>
        </div>
      </ClayModal>
    </div>
  );
};
