import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ActivityLogEntry } from "../../types";
import { tauriBridge } from "../../services/tauriBridge";
import { ClayCard, ClayButton } from "../ui";
import {
  ShieldCheck,
  ShieldOff,
  Skull,
  AlertTriangle,
  Lock,
  Unlock,
  FolderLock,
  FolderOpen,
  Plus,
  Trash2,
  RefreshCw,
  Download,
  FileText,
  Clock,
  Search,
  Filter,
  ChevronDown,
} from "lucide-react";

const EVENT_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  "App Intercepted": {
    icon: <ShieldOff className="w-4 h-4" />,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/50",
    border: "border-rose-200 dark:border-rose-900/50",
  },
  "App Unlocked": {
    icon: <ShieldCheck className="w-4 h-4" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    border: "border-emerald-200 dark:border-emerald-900/50",
  },
  "App Terminated": {
    icon: <Skull className="w-4 h-4" />,
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/50",
    border: "border-red-200 dark:border-red-900/50",
  },
  "Unlock Failed": {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/50",
    border: "border-amber-200 dark:border-amber-900/50",
  },
  "Account Locked Out": {
    icon: <Lock className="w-4 h-4" />,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-950/60",
    border: "border-red-300 dark:border-red-900/60",
  },
  "Folder Locked": {
    icon: <FolderLock className="w-4 h-4" />,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/50",
    border: "border-indigo-200 dark:border-indigo-900/50",
  },
  "Folder Unlocked": {
    icon: <FolderOpen className="w-4 h-4" />,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/50",
    border: "border-sky-200 dark:border-sky-900/50",
  },
  "Lock All Triggered": {
    icon: <Lock className="w-4 h-4" />,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/50",
    border: "border-purple-200 dark:border-purple-900/50",
  },
  "App Added": {
    icon: <Plus className="w-4 h-4" />,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/50",
    border: "border-teal-200 dark:border-teal-900/50",
  },
  "App Removed": {
    icon: <Trash2 className="w-4 h-4" />,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-950/50",
    border: "border-slate-200 dark:border-slate-800/50",
  },
  "Folder Added": {
    icon: <Plus className="w-4 h-4" />,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/50",
    border: "border-teal-200 dark:border-teal-900/50",
  },
  "Folder Removed": {
    icon: <Trash2 className="w-4 h-4" />,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-950/50",
    border: "border-slate-200 dark:border-slate-800/50",
  },
};

const DEFAULT_CONFIG = {
  icon: <Clock className="w-4 h-4" />,
  color: "text-slate-500 dark:text-slate-400",
  bg: "bg-slate-50 dark:bg-slate-900/50",
  border: "border-slate-200 dark:border-slate-800/50",
};

function formatTimestamp(epoch: number): string {
  const date = new Date(epoch * 1000);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullTimestamp(epoch: number): string {
  return new Date(epoch * 1000).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const ALL_FILTERS = [
  "All Events",
  "App Intercepted",
  "App Unlocked",
  "App Terminated",
  "Unlock Failed",
  "Account Locked Out",
  "Folder Locked",
  "Folder Unlocked",
  "Lock All Triggered",
  "App Added",
  "App Removed",
];

interface ActivityLogTabProps {
  onNotification?: (msg: string) => void;
}

export const ActivityLogTab: React.FC<ActivityLogTabProps> = ({
  onNotification,
}) => {
  const [events, setEvents] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKind, setFilterKind] = useState("All Events");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [logFilePath, setLogFilePath] = useState("");

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const [log, path] = await Promise.all([
        tauriBridge.getActivityLog(500),
        tauriBridge.getLogFilePath(),
      ]);
      setEvents(log);
      setLogFilePath(path);
    } catch (e) {
      console.error("Failed to load activity log", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Auto-refresh every 8 seconds
  useEffect(() => {
    const interval = setInterval(loadEvents, 8000);
    return () => clearInterval(interval);
  }, [loadEvents]);

  const filteredEvents = events.filter((e) => {
    const matchesFilter =
      filterKind === "All Events" || e.kind === filterKind;
    const matchesSearch =
      searchQuery === "" ||
      e.targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.kind.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExport = async () => {
    try {
      // In Tauri, the backend exports to a known path
      const path = await tauriBridge.getLogFilePath();
      const exportPath = path.replace("activity.log", "activity_export.txt");
      await tauriBridge.exportActivityLog(exportPath);
      onNotification?.(`Activity log exported to ${exportPath}`);
    } catch {
      onNotification?.("Activity log export completed");
    }
  };

  // Group events by date
  const groupedEvents: { date: string; events: ActivityLogEntry[] }[] = [];
  let currentGroup: { date: string; events: ActivityLogEntry[] } | null = null;

  for (const event of filteredEvents) {
    const dateStr = new Date(event.timestamp * 1000).toLocaleDateString(
      undefined,
      { weekday: "long", year: "numeric", month: "long", day: "numeric" }
    );
    if (!currentGroup || currentGroup.date !== dateStr) {
      currentGroup = { date: dateStr, events: [] };
      groupedEvents.push(currentGroup);
    }
    currentGroup.events.push(event);
  }

  // Stats
  const totalInterceptions = events.filter(
    (e) => e.kind === "App Intercepted"
  ).length;
  const totalUnlocks = events.filter(
    (e) => e.kind === "App Unlocked"
  ).length;
  const totalFailures = events.filter(
    (e) => e.kind === "Unlock Failed" || e.kind === "App Terminated"
  ).length;

  if (isLoading) {
    return (
      <div className="p-12 text-center text-sm font-semibold text-[#5A6582] dark:text-[#94A3B8]">
        <div className="w-8 h-8 mx-auto mb-3 rounded-full border-3 border-indigo-400 border-t-transparent animate-spin" />
        <span>Loading Activity Log...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ClayCard
          variant="surface"
          radius="lg"
          className="p-4 border border-rose-150 dark:border-rose-900/40"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[16px] bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(160,175,205,0.4)] dark:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.06),inset_-2px_-2px_4px_rgba(0,0,0,0.6)]">
              <ShieldOff className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 leading-none">
                {totalInterceptions}
              </p>
              <p className="text-[11px] font-bold text-[#5A6582] dark:text-[#94A3B8]">
                Interceptions
              </p>
            </div>
          </div>
        </ClayCard>

        <ClayCard
          variant="surface"
          radius="lg"
          className="p-4 border border-emerald-150 dark:border-emerald-900/40"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[16px] bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(160,175,205,0.4)] dark:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.06),inset_-2px_-2px_4px_rgba(0,0,0,0.6)]">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                {totalUnlocks}
              </p>
              <p className="text-[11px] font-bold text-[#5A6582] dark:text-[#94A3B8]">
                Successful Unlocks
              </p>
            </div>
          </div>
        </ClayCard>

        <ClayCard
          variant="surface"
          radius="lg"
          className="p-4 border border-amber-150 dark:border-amber-900/40"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[16px] bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-2px_4px_rgba(160,175,205,0.4)] dark:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.06),inset_-2px_-2px_4px_rgba(0,0,0,0.6)]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">
                {totalFailures}
              </p>
              <p className="text-[11px] font-bold text-[#5A6582] dark:text-[#94A3B8]">
                Failures / Kills
              </p>
            </div>
          </div>
        </ClayCard>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search events, targets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs font-semibold rounded-[16px] bg-white dark:bg-[#1A2030] border border-[#E2E8F4] dark:border-[#2A344A] text-[#1E2538] dark:text-[#F1F5F9] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all shadow-[inset_1px_1px_3px_rgba(160,175,205,0.15)] dark:shadow-[inset_1px_1px_3px_rgba(0,0,0,0.3)]"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-[16px] bg-white dark:bg-[#1A2030] border border-[#E2E8F4] dark:border-[#2A344A] text-[#1E2538] dark:text-[#F1F5F9] hover:border-indigo-400 transition-all shadow-sm"
          >
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>{filterKind}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                className="absolute right-0 top-12 z-50 w-56 p-1.5 rounded-[18px] bg-white dark:bg-[#1A2030] border border-[#E2E8F4] dark:border-[#2A344A] shadow-xl"
              >
                {ALL_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFilterKind(f);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-[14px] text-xs font-semibold transition-all ${
                      filterKind === f
                        ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                        : "text-[#5A6582] dark:text-[#94A3B8] hover:bg-[#F1F5FB] dark:hover:bg-[#161C2A]"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Click-outside overlay */}
          {isFilterOpen && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsFilterOpen(false)}
            />
          )}
        </div>

        {/* Refresh */}
        <ClayButton
          variant="surface"
          size="sm"
          onClick={loadEvents}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </ClayButton>

        {/* Export */}
        <ClayButton
          variant="surface"
          size="sm"
          onClick={handleExport}
          leftIcon={<Download className="w-3.5 h-3.5" />}
        >
          Export
        </ClayButton>
      </div>

      {/* Event Timeline */}
      {filteredEvents.length === 0 ? (
        <ClayCard
          variant="surface"
          radius="lg"
          className="p-12 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-[24px] bg-[#F1F5FB] dark:bg-[#161C2A] flex items-center justify-center">
            <FileText className="w-8 h-8 text-[#94A3B8]" />
          </div>
          <h3 className="text-base font-extrabold text-[#1E2538] dark:text-[#F1F5F9] mb-1">
            {searchQuery || filterKind !== "All Events"
              ? "No Matching Events"
              : "No Activity Recorded Yet"}
          </h3>
          <p className="text-xs text-[#5A6582] dark:text-[#94A3B8]">
            {searchQuery || filterKind !== "All Events"
              ? "Try adjusting your search or filter criteria."
              : "Events will appear here as ClayLock intercepts and protects your applications."}
          </p>
        </ClayCard>
      ) : (
        <div className="space-y-6">
          {groupedEvents.map((group) => (
            <div key={group.date}>
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#5A6582] dark:text-[#94A3B8] whitespace-nowrap">
                  {group.date}
                </span>
                <div className="flex-1 h-px bg-[#E8EEF8] dark:bg-[#222B3D]" />
                <span className="text-[10px] font-bold text-[#94A3B8] dark:text-[#5A6582]">
                  {group.events.length} event
                  {group.events.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-2">
                {group.events.map((event, idx) => {
                  const cfg = EVENT_CONFIG[event.kind] || DEFAULT_CONFIG;
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.25 }}
                    >
                      <div
                        className={`relative flex items-start gap-3.5 p-3.5 rounded-[18px] ${cfg.bg} border ${cfg.border} transition-all hover:shadow-sm group`}
                      >
                        {/* Timeline connector line */}
                        {idx < group.events.length - 1 && (
                          <div className="absolute left-[1.65rem] top-[3.25rem] bottom-[-0.75rem] w-px bg-gradient-to-b from-[#D2DAE8] to-transparent dark:from-[#2A344A]" />
                        )}

                        {/* Icon */}
                        <div
                          className={`w-8 h-8 rounded-[12px] ${cfg.color} bg-white dark:bg-[#1A2030] flex items-center justify-center shrink-0 shadow-sm z-10 border ${cfg.border}`}
                        >
                          {cfg.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`text-xs font-black ${cfg.color}`}
                              >
                                {event.kind}
                              </span>
                              <span className="text-[11px] font-extrabold text-[#1E2538] dark:text-[#F1F5F9] truncate">
                                {event.targetName}
                              </span>
                            </div>
                            <span
                              className="text-[10px] font-semibold text-[#94A3B8] dark:text-[#5A6582] shrink-0"
                              title={formatFullTimestamp(event.timestamp)}
                            >
                              {formatTimestamp(event.timestamp)}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5A6582] dark:text-[#94A3B8] leading-snug truncate">
                            {event.details}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log File Path */}
      {logFilePath && (
        <div className="flex items-center gap-2 text-[11px] text-[#94A3B8] dark:text-[#5A6582] px-2 pt-2">
          <FileText className="w-3 h-3 shrink-0" />
          <span className="truncate font-mono">{logFilePath}</span>
        </div>
      )}
    </div>
  );
};
