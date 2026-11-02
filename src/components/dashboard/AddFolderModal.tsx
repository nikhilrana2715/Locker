import React, { useState } from "react";
import { ClayModal, ClayButton, ClayToggle, FolderIcon } from "../ui";
import { tauriBridge } from "../../services/tauriBridge";
import {
  Lock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface AddFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderAdded: (name: string, path: string, lockImmediately: boolean) => Promise<void>;
}

export const AddFolderModal: React.FC<AddFolderModalProps> = ({
  isOpen,
  onClose,
  onFolderAdded,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<{ name: string; path: string } | null>(null);
  const [lockImmediately, setLockImmediately] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick select folder
  const handlePickFolder = async () => {
    setError(null);
    try {
      const picked = await tauriBridge.pickFolder();
      if (picked) {
        const dirName = picked.split(/[\\/]/).filter(Boolean).pop() || "Protected Folder";
        setSelectedFolder({
          name: dirName,
          path: picked,
        });
      }
    } catch (e: any) {
      setError(e?.message || "Failed to open folder picker.");
    }
  };

  // Quick select individual file
  const handlePickFile = async () => {
    setError(null);
    try {
      const picked = await tauriBridge.pickFile();
      if (picked) {
        const fileName = picked.split(/[\\/]/).filter(Boolean).pop() || "Protected File";
        setSelectedFolder({
          name: fileName,
          path: picked,
        });
      }
    } catch (e: any) {
      setError(e?.message || "Failed to open file picker.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolder) {
      setError("Please select a folder to protect.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onFolderAdded(selectedFolder.name, selectedFolder.path, lockImmediately);
      onClose();
      setSelectedFolder(null);
      setLockImmediately(true);
    } catch (e: any) {
      setError(e?.message || "Failed to protect folder.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ClayModal
      isOpen={isOpen}
      onClose={onClose}
      title="Protect Folder"
      description="Select any folder from your computer to enable instant lock protection."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Dual buttons: Pick Folder or Pick Individual File */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={handlePickFolder}
            className="p-5 rounded-[22px] bg-[#FFF8F3] dark:bg-[#1E1917] border-2 border-dashed border-[#FDBA74] dark:border-[#9A3412] hover:border-amber-500 cursor-pointer text-center transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-sm"
          >
            <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FolderIcon size="lg" isLocked={false} />
            </div>
            <h4 className="text-sm font-black text-[#1E2538] dark:text-[#F1F5F9] mb-0.5">
              Select Folder
            </h4>
            <p className="text-[11px] text-[#5A6582] dark:text-[#94A3B8]">
              Browse & lock an entire directory
            </p>
          </div>

          <div
            onClick={handlePickFile}
            className="p-5 rounded-[22px] bg-[#EFF6FF] dark:bg-[#131E33] border-2 border-dashed border-[#93C5FD] dark:border-[#1E3A8A] hover:border-blue-500 cursor-pointer text-center transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-sm"
          >
            <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform">
              <Lock className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-black text-[#1E2538] dark:text-[#F1F5F9] mb-0.5">
              Select File
            </h4>
            <p className="text-[11px] text-[#5A6582] dark:text-[#94A3B8]">
              Browse & lock any specific file
            </p>
          </div>
        </div>

        {/* Selected Folder Preview */}
        {selectedFolder && (
          <div className="p-4 rounded-[20px] bg-white dark:bg-[#1A2030] border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <FolderIcon size="md" isLocked={lockImmediately} />
              <div className="min-w-0">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block uppercase tracking-wider">
                  Ready to Lock
                </span>
                <p className="text-base font-extrabold text-[#1E2538] dark:text-[#F1F5F9] truncate">
                  {selectedFolder.name}
                </p>
                <p className="text-xs text-[#5A6582] dark:text-[#94A3B8] font-mono truncate">
                  {selectedFolder.path}
                </p>
              </div>
            </div>

            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
          </div>
        )}

        {/* Lock Action Enable Toggle */}
        <div className="p-4 rounded-[20px] bg-white dark:bg-[#1A2030] border border-[#E8EEF8] dark:border-[#222B3D] flex items-center justify-between gap-3 shadow-sm">
          <div>
            <p className="text-sm font-extrabold text-[#1E2538] dark:text-[#F1F5F9]">
              Enable Lock Action
            </p>
            <p className="text-xs text-[#5A6582] dark:text-[#94A3B8]">
              Restricts access immediately upon adding
            </p>
          </div>
          <ClayToggle
            checked={lockImmediately}
            onChange={setLockImmediately}
            variant="peach"
            label=""
          />
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3.5 rounded-[16px] bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900 flex items-center gap-2.5 text-xs font-bold text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <ClayButton type="button" variant="surface" size="md" onClick={onClose}>
            Cancel
          </ClayButton>
          <ClayButton
            type="submit"
            variant="peach"
            size="md"
            isLoading={isSubmitting}
            disabled={!selectedFolder}
            leftIcon={<Lock className="w-4 h-4" />}
          >
            Lock & Protect Folder
          </ClayButton>
        </div>
      </form>
    </ClayModal>
  );
};
