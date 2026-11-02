import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProtectedApp, DiscoveredApp } from "../../types";
import { ClayCard, ClayToggle, ClayButton, AppIcon } from "../ui";
import {
  Lock,
  Unlock,
  Trash2,
  AppWindow,
  ShieldAlert,
  Plus,
  RefreshCw,
  Laptop,
} from "lucide-react";

export interface UnifiedAppItem {
  id: string;
  name: string;
  executablePath: string;
  iconBase64?: string | null;
  isProtected: boolean;
  isLocked: boolean;
  addedAt?: number;
}

interface AppGridProps {
  protectedApps: ProtectedApp[];
  installedApps: DiscoveredApp[];
  searchQuery: string;
  isScanning?: boolean;
  onRescan?: () => void;
  onToggleLock: (
    id: string,
    isLocked: boolean,
    item?: { name: string; executablePath: string }
  ) => void;
  onRemoveApp: (id: string) => void;
  onOpenAddModal: () => void;
}

export const AppGrid: React.FC<AppGridProps> = ({
  protectedApps,
  installedApps,
  searchQuery,
  isScanning = false,
  onRescan,
  onToggleLock,
  onRemoveApp,
  onOpenAddModal,
}) => {
  const [filterView, setFilterView] = useState<"all" | "guarded" | "unlocked">("all");

  // Merge installed PC applications with currently protected apps
  const unifiedApps: UnifiedAppItem[] = useMemo(() => {
    const list: UnifiedAppItem[] = [];
    const seenPaths = new Set<string>();

    // 1. Process installed applications discovered on the PC
    for (const inst of installedApps) {
      const normPath = inst.executablePath.toLowerCase();
      seenPaths.add(normPath);

      // Check if this app is currently in protected list
      const matched = protectedApps.find(
        (p) =>
          p.executablePath.toLowerCase() === normPath ||
          p.name.toLowerCase() === inst.name.toLowerCase()
      );

      if (matched) {
        list.push({
          id: matched.id,
          name: matched.name || inst.name,
          executablePath: inst.executablePath,
          iconBase64: inst.iconBase64 || matched.iconBase64,
          isProtected: true,
          isLocked: matched.isLocked,
          addedAt: matched.addedAt,
        });
      } else {
        list.push({
          id: `unprotected_${normPath}`,
          name: inst.name,
          executablePath: inst.executablePath,
          iconBase64: inst.iconBase64,
          isProtected: false,
          isLocked: false,
        });
      }
    }

    // 2. Add any protected apps that weren't in the discovered list (e.g. manual .exe additions)
    for (const prot of protectedApps) {
      const normPath = prot.executablePath.toLowerCase();
      if (!seenPaths.has(normPath)) {
        seenPaths.add(normPath);
        list.push({
          id: prot.id,
          name: prot.name,
          executablePath: prot.executablePath,
          iconBase64: prot.iconBase64,
          isProtected: true,
          isLocked: prot.isLocked,
          addedAt: prot.addedAt,
        });
      }
    }

    // Sort: Guarded apps first, then alphabetically
    return list.sort((a, b) => {
      if (a.isLocked !== b.isLocked) {
        return a.isLocked ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [installedApps, protectedApps]);

  // Apply search query and active view filter
  const filteredApps = useMemo(() => {
    return unifiedApps.filter((app) => {
      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.executablePath.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterView === "guarded") return app.isLocked;
      if (filterView === "unlocked") return !app.isLocked;
      return true;
    });
  }, [unifiedApps, searchQuery, filterView]);

  const totalGuarded = useMemo(
    () => unifiedApps.filter((a) => a.isLocked).length,
    [unifiedApps]
  );
  const totalUnlocked = unifiedApps.length - totalGuarded;

  return (
    <div className="space-y-5">
      {/* Sub-Header: Filter Pills, Discovery Count & Rescan */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#E8EEF8] dark:border-[#222B3D]">
        {/* View Mode Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterView("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterView === "all"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-[#EAEFF8] text-[#5A6582] dark:bg-[#1E2538] dark:text-[#94A3B8] hover:bg-slate-200"
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>All PC Applications</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
              {unifiedApps.length}
            </span>
          </button>

          <button
            onClick={() => setFilterView("guarded")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterView === "guarded"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-[#EAEFF8] text-[#5A6582] dark:bg-[#1E2538] dark:text-[#94A3B8] hover:bg-slate-200"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Locked & Guarded</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
              {totalGuarded}
            </span>
          </button>

          <button
            onClick={() => setFilterView("unlocked")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterView === "unlocked"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-[#EAEFF8] text-[#5A6582] dark:bg-[#1E2538] dark:text-[#94A3B8] hover:bg-slate-200"
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Unlocked</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
              {totalUnlocked}
            </span>
          </button>
        </div>

        {/* Rescan & Custom Action Buttons */}
        <div className="flex items-center gap-2">
          {onRescan && (
            <ClayButton
              variant="surface"
              size="sm"
              disabled={isScanning}
              leftIcon={
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-indigo-500" : ""}`}
                />
              }
              onClick={onRescan}
              title="Rescan installed applications on this PC"
            >
              {isScanning ? "Scanning PC..." : "Rescan PC"}
            </ClayButton>
          )}

          <ClayButton
            variant="surface"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={onOpenAddModal}
            title="Browse any executable file"
          >
            Browse .exe
          </ClayButton>
        </div>
      </div>

      {/* Empty State */}
      {filteredApps.length === 0 && (
        <ClayCard
          variant="surface"
          radius="lg"
          className="p-12 text-center max-w-xl mx-auto my-6 border-2 border-dashed border-[#D2DAE8] dark:border-[#2A344A]"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-[24px] bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-500">
            <AppWindow className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[#1E2538] dark:text-[#F1F5F9] mb-1">
            {searchQuery
              ? `No installed applications match "${searchQuery}"`
              : filterView === "guarded"
              ? "No applications are currently locked"
              : "No applications found"}
          </h3>
          <p className="text-xs text-[#5A6582] dark:text-[#94A3B8] mb-4">
            {filterView === "guarded"
              ? "Switch to 'All PC Applications' tab and toggle lock on any application."
              : "Try searching with a different name or browse any custom executable."}
          </p>
          {filterView === "guarded" && (
            <ClayButton
              variant="lavender"
              size="sm"
              onClick={() => setFilterView("all")}
            >
              View All PC Applications
            </ClayButton>
          )}
        </ClayCard>
      )}

      {/* Grid of Real Installed Applications */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence mode="popLayout">
          {filteredApps.map((app) => (
            <motion.div
              key={app.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.15 }}
            >
              <ClayCard
                variant="surface"
                hoverLift={true}
                radius="lg"
                className={`p-5 flex flex-col justify-between h-full relative overflow-hidden group transition-all ${
                  app.isLocked
                    ? "border-2 border-rose-300 dark:border-rose-900/60 shadow-[0_8px_20px_-6px_rgba(244,63,94,0.15)]"
                    : "border border-transparent"
                }`}
              >
                {/* Header: App Avatar, Name & Lock Badge */}
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* App Icon with Security Pin Badge */}
                    <div className="relative shrink-0">
                      <AppIcon
                        name={app.name}
                        iconBase64={app.iconBase64 || undefined}
                        size="lg"
                        className="transition-transform group-hover:scale-105"
                      />
                      <div
                        className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm border-2 border-white dark:border-[#1E2538] ${
                          app.isLocked
                            ? "bg-rose-500 text-white"
                            : "bg-emerald-500 text-white"
                        }`}
                        title={
                          app.isLocked
                            ? "Lock Guard Active • Intercept & Suspend"
                            : "Accessible • Protection Disabled"
                        }
                      >
                        {app.isLocked ? (
                          <Lock className="w-2.5 h-2.5" />
                        ) : (
                          <Unlock className="w-2.5 h-2.5" />
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h4
                        className="font-extrabold text-[#1E2538] dark:text-[#F1F5F9] truncate text-base leading-tight mb-0.5"
                        title={app.name}
                      >
                        {app.name}
                      </h4>
                      <p
                        className="text-[11px] font-mono text-[#5A6582] dark:text-[#94A3B8] truncate mb-1.5"
                        title={app.executablePath}
                      >
                        {app.executablePath
                          ? app.executablePath.split(/[\\/]/).pop()
                          : "app.exe"}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          app.isLocked
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {app.isLocked ? (
                          <>
                            <Lock className="w-2.5 h-2.5" /> Guarded 🔒
                          </>
                        ) : (
                          <>
                            <Unlock className="w-2.5 h-2.5" /> Unlocked
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Remove Button (Only for manually added protected apps) */}
                  {app.isProtected && (
                    <button
                      onClick={() => onRemoveApp(app.id)}
                      title="Remove from custom protected apps"
                      className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Bar */}
                <div
                  className={`py-2 px-3 rounded-[14px] flex items-center justify-between mb-3.5 text-xs ${
                    app.isLocked
                      ? "bg-rose-50/70 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
                      : "bg-[#F1F5FB] text-[#5A6582] dark:bg-[#161C2A] dark:text-[#94A3B8]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold truncate">
                    {app.isLocked ? (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">Launch Watcher Active</span>
                      </>
                    ) : (
                      <>
                        <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Installed on this PC</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] font-bold shrink-0">
                    {app.isLocked ? "PROTECTED" : "READY TO LOCK"}
                  </span>
                </div>

                {/* Bottom Action: Direct Lock Toggle */}
                <div className="flex items-center justify-between pt-3 border-t border-[#E8EEF8] dark:border-[#222B3D]">
                  <div>
                    <span className="text-xs font-extrabold text-[#1E2538] dark:text-[#F1F5F9] block">
                      Lock Action
                    </span>
                    <span className="text-[11px] text-[#5A6582] dark:text-[#94A3B8]">
                      {app.isLocked ? "Application is locked" : "Enable lock protection"}
                    </span>
                  </div>

                  <ClayToggle
                    checked={app.isLocked}
                    onChange={(checked) =>
                      onToggleLock(app.id, checked, {
                        name: app.name,
                        executablePath: app.executablePath,
                      })
                    }
                    variant={app.isLocked ? "rose" : "lavender"}
                    label=""
                  />
                </div>
              </ClayCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
