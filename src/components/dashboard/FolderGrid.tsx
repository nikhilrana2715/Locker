import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProtectedFolder } from "../../types";
import { ClayCard, ClayToggle, ClayButton, FolderIcon } from "../ui";
import {
  Lock,
  Unlock,
  Trash2,
  ShieldAlert,
  Plus,
  ShieldCheck,
  ExternalLink,
  KeyRound,
} from "lucide-react";

interface FolderGridProps {
  folders: ProtectedFolder[];
  searchQuery: string;
  onToggleLock: (id: string, isLocked: boolean) => void;
  onRemoveFolder: (id: string) => void;
  onOpenAddModal: () => void;
  onOpenItem?: (folder: ProtectedFolder) => void;
}

export const FolderGrid: React.FC<FolderGridProps> = ({
  folders,
  searchQuery,
  onToggleLock,
  onRemoveFolder,
  onOpenAddModal,
  onOpenItem,
}) => {
  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (folders.length === 0) {
    return (
      <ClayCard
        variant="surface"
        radius="lg"
        className="p-12 text-center max-w-xl mx-auto my-8 border-2 border-dashed border-[#D2DAE8] dark:border-[#2A344A]"
      >
        <div className="w-20 h-20 mx-auto mb-5 flex items-center justify-center">
          <FolderIcon size="xl" isLocked={true} />
        </div>
        <h3 className="text-xl font-extrabold text-[#1E2538] dark:text-[#F1F5F9] mb-2">
          No Protected Folders Yet
        </h3>
        <p className="text-sm text-[#5A6582] dark:text-[#94A3B8] mb-6 max-w-md mx-auto">
          Click the button below to pick any folder from your PC and enable instant NTFS lock protection.
        </p>
        <ClayButton
          variant="peach"
          size="lg"
          leftIcon={<Plus className="w-5 h-5" />}
          onClick={onOpenAddModal}
        >
          + Protect Folder
        </ClayButton>
      </ClayCard>
    );
  }

  if (filteredFolders.length === 0) {
    return (
      <ClayCard variant="surface" radius="lg" className="p-8 text-center my-6">
        <p className="text-sm font-semibold text-[#5A6582] dark:text-[#94A3B8]">
          No protected folders match "{searchQuery}"
        </p>
      </ClayCard>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <AnimatePresence mode="popLayout">
        {filteredFolders.map((folder) => (
          <motion.div
            key={folder.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <ClayCard
              variant="surface"
              hoverLift={true}
              radius="lg"
              className="p-5 flex flex-col justify-between h-full relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Top Row: Folder Icon + Status Pill */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <FolderIcon
                    isLocked={folder.isLocked}
                    size="lg"
                    className="transition-transform group-hover:scale-105"
                  />

                  <div className="min-w-0">
                    <h4
                      className="font-extrabold text-[#1E2538] dark:text-[#F1F5F9] truncate text-base leading-tight mb-0.5"
                      title={folder.name}
                    >
                      {folder.name}
                    </h4>
                    <p
                      className="text-[11px] font-mono text-[#5A6582] dark:text-[#94A3B8] truncate mb-1.5"
                      title={folder.path}
                    >
                      {folder.path}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        folder.isLocked
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                      }`}
                    >
                      {folder.isLocked ? (
                        <>
                          <Lock className="w-2.5 h-2.5" /> NTFS Locked
                        </>
                      ) : (
                        <>
                          <Unlock className="w-2.5 h-2.5" /> Accessible
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onRemoveFolder(folder.id)}
                  title="Remove from protected folders"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Status Indicator Bar */}
              <div className="py-2.5 px-3 rounded-[16px] bg-[#F1F5FB] dark:bg-[#161C2A] flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#5A6582] dark:text-[#94A3B8]">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span>NTFS ACL Protection</span>
                </div>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Secured
                </span>
              </div>

              {/* Bottom Action: Unlock & Open with Password + Toggle */}
              <div className="pt-3 border-t border-[#E8EEF8] dark:border-[#222B3D] flex items-center justify-between gap-3">
                <ClayButton
                  variant={folder.isLocked ? "peach" : "mint"}
                  size="sm"
                  onClick={() => onOpenItem ? onOpenItem(folder) : onToggleLock(folder.id, !folder.isLocked)}
                  leftIcon={folder.isLocked ? <KeyRound className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  className="flex-1 text-xs font-bold py-2 justify-center"
                >
                  {folder.isLocked ? "Unlock & Open" : "Open in Explorer"}
                </ClayButton>

                <div className="shrink-0 flex items-center gap-1.5" title={folder.isLocked ? "Locked - Access Denied" : "Unlocked - Accessible"}>
                  <ClayToggle
                    checked={folder.isLocked}
                    onChange={(checked) => onToggleLock(folder.id, checked)}
                    variant="peach"
                    label=""
                  />
                </div>
              </div>
            </ClayCard>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
