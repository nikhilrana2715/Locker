import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ClayCard } from "./ClayCard";

export interface ClayModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
}

export const ClayModal: React.FC<ClayModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
  showCloseButton = true,
}) => {
  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with soft frosted blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/35 dark:bg-black/65 backdrop-blur-sm"
          />

          {/* 3D Popping Clay Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className={`relative w-full ${maxWidthClasses[maxWidth]} z-10`}
          >
            <ClayCard radius="xl" variant="surface" className="p-7 md:p-8">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  {title && (
                    <h3 className="text-xl font-black text-[#1E2538] dark:text-[#F1F5F9] font-display">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="mt-1 text-sm text-[#5A6582] dark:text-[#94A3B8]">
                      {description}
                    </p>
                  )}
                </div>

                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close modal"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#8E99B5] hover:text-[#1E2538] dark:hover:text-[#F1F5F9] bg-[#F1F4F9] dark:bg-[#282F45] hover:scale-105 active:scale-95 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="mt-2">{children}</div>
            </ClayCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
