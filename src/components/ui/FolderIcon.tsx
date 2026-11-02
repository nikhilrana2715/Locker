import React from "react";
import { Lock, Unlock } from "lucide-react";

interface FolderIconProps {
  isLocked?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const FolderIcon: React.FC<FolderIconProps> = ({
  isLocked = false,
  size = "md",
  className = "",
}) => {
  const containerSizes = {
    sm: "w-8 h-8 rounded-[12px]",
    md: "w-12 h-12 rounded-[18px]",
    lg: "w-14 h-14 rounded-[22px]",
    xl: "w-16 h-16 rounded-[24px]",
  };

  const svgSizes = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-9 h-9",
    xl: "w-10 h-10",
  };

  const badgeSizes = {
    sm: "w-3.5 h-3.5 -bottom-0.5 -right-0.5",
    md: "w-4.5 h-4.5 -bottom-1 -right-1",
    lg: "w-5 h-5 -bottom-1 -right-1",
    xl: "w-6 h-6 -bottom-1.5 -right-1.5",
  };

  const iconSizes = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
    xl: "w-3.5 h-3.5",
  };

  return (
    <div
      className={`relative ${containerSizes[size]} flex items-center justify-center shrink-0 ${
        isLocked
          ? "bg-gradient-to-b from-[#FFF5EB] to-[#FEE8D6] dark:from-[#2A2018] dark:to-[#1C1610] border border-[#FDBA74]/40 dark:border-[#EA580C]/30"
          : "bg-gradient-to-b from-[#F0FDF4] to-[#DCFCE7] dark:from-[#13261B] dark:to-[#0D1C13] border border-[#86EFAC]/40 dark:border-[#16A34A]/30"
      } shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.8),2px_3px_8px_rgba(234,88,12,0.1)] dark:shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.05),2px_3px_8px_rgba(0,0,0,0.4)] ${className}`}
    >
      {/* Windows 11 Fluent Folder SVG */}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${svgSizes[size]} drop-shadow-sm`}
      >
        <defs>
          <linearGradient id="folderBack" x1="8" y1="12" x2="56" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F59E0B" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="folderPaper" x1="14" y1="16" x2="50" y2="34" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#E2E8F0" />
          </linearGradient>
          <linearGradient id="folderFront" x1="8" y1="26" x2="56" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FBBF24" />
            <stop offset="1" stopColor="#F59E0B" />
          </linearGradient>
        </defs>

        {/* Back plate with tab */}
        <path
          d="M8 18C8 14.6863 10.6863 12 14 12H25.1716C26.7629 12 28.2893 12.6321 29.4142 13.7574L32.2426 16.5858C33.3675 17.7107 34.8939 18.3428 36.4853 18.3428H50C53.3137 18.3428 56 21.0291 56 24.3428V46C56 49.3137 53.3137 52 50 52H14C10.6863 52 8 49.3137 8 46V18Z"
          fill="url(#folderBack)"
        />

        {/* Paper sheet inside */}
        <rect
          x="14"
          y="20"
          width="36"
          height="18"
          rx="3"
          fill="url(#folderPaper)"
          opacity="0.85"
        />

        {/* Front pocket */}
        <path
          d="M8 28C8 25.7909 9.79086 24 12 24H52C54.2091 24 56 25.7909 56 28V46C56 49.3137 53.3137 52 50 52H14C10.6863 52 8 49.3137 8 46V28Z"
          fill="url(#folderFront)"
        />
        <path
          d="M8 28C8 26.3431 9.34315 25 11 25H53C54.6569 25 56 26.3431 56 28V29C56 29 53 28 32 28C11 28 8 29 8 29V28Z"
          fill="#FEF3C7"
          opacity="0.6"
        />
      </svg>

      {/* Security Status Mini Badge */}
      <div
        className={`absolute ${badgeSizes[size]} rounded-full flex items-center justify-center border-2 border-white dark:border-[#1E2538] shadow-sm ${
          isLocked
            ? "bg-amber-600 text-white"
            : "bg-emerald-600 text-white"
        }`}
      >
        {isLocked ? (
          <Lock className={iconSizes[size]} />
        ) : (
          <Unlock className={iconSizes[size]} />
        )}
      </div>
    </div>
  );
};
