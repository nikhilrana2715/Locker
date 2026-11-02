import React from "react";

interface AppIconProps {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  iconBase64?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  className = "",
  size = "md",
  iconBase64,
}) => {
  const sizeClasses = {
    sm: "w-8 h-8 rounded-[12px] p-1.5",
    md: "w-12 h-12 rounded-[18px] p-2",
    lg: "w-14 h-14 rounded-[22px] p-2.5",
    xl: "w-16 h-16 rounded-[24px] p-3",
  };

  const imgSizes = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-9 h-9",
    xl: "w-10 h-10",
  };

  if (iconBase64) {
    return (
      <div
        className={`${sizeClasses[size]} bg-white dark:bg-[#1E2538] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9),2px_3px_8px_rgba(160,175,205,0.25)] dark:shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.08),2px_3px_8px_rgba(0,0,0,0.5)] border border-[#E8EEF8] dark:border-[#2A344A] ${className}`}
      >
        <img
          src={iconBase64}
          alt={name}
          className={`${imgSizes[size]} object-contain`}
        />
      </div>
    );
  }

  const lower = name.toLowerCase();

  // 1. Google Chrome
  if (lower.includes("chrome")) {
    return (
      <div
        className={`${sizeClasses[size]} bg-white dark:bg-[#1E2538] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9),2px_3px_8px_rgba(160,175,205,0.25)] dark:shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.08),2px_3px_8px_rgba(0,0,0,0.5)] border border-[#E8EEF8] dark:border-[#2A344A] ${className}`}
      >
        <svg viewBox="0 0 48 48" className={imgSizes[size]}>
          <circle cx="24" cy="24" r="21" fill="#EA4335" />
          <path d="M24 12h17.3A21 21 0 0 1 24 45L13.5 27 24 12z" fill="#4285F4" />
          <path d="M12 24 3.3 9A21 21 0 0 1 24 3l10.5 18H12z" fill="#FBBC05" />
          <path d="M24 12l-10.5 15H3.3A21 21 0 0 0 24 45l8.7-15H24z" fill="#34A853" />
          <circle cx="24" cy="24" r="9" fill="#FFFFFF" />
          <circle cx="24" cy="24" r="7.5" fill="#4285F4" />
        </svg>
      </div>
    );
  }

  // 2. Discord
  if (lower.includes("discord")) {
    return (
      <div
        className={`${sizeClasses[size]} bg-[#5865F2] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.4),2px_3px_8px_rgba(88,101,242,0.35)] ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="#FFFFFF" className={imgSizes[size]}>
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      </div>
    );
  }

  // 3. Steam
  if (lower.includes("steam")) {
    return (
      <div
        className={`${sizeClasses[size]} bg-[#171A21] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.2),2px_3px_8px_rgba(0,0,0,0.5)] ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="#FFFFFF" className={imgSizes[size]}>
          <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658a3.279 3.279 0 0 1 2.502-.857l3.743-5.422a4.912 4.912 0 1 1 4.908 4.912l-5.42 3.742a3.284 3.284 0 0 1-2.923 2.196L6.61 23.93c1.716.48 3.528.74 5.37.74 6.627 0 12-5.373 12-12s-5.373-12-12-12zM8.328 15.657a2.051 2.051 0 1 0-1.684-2.895l-3.93-1.624A10.748 10.748 0 0 0 1.25 12c0 5.434 4.045 9.92 9.297 10.638l2.095-5.068a2.053 2.053 0 0 0-4.314-1.913zm8.793-6.616a3.28 3.28 0 1 0-3.279-3.28 3.28 3.28 0 0 0 3.279 3.28zm0-4.918a1.639 1.639 0 1 1-1.639 1.638 1.64 1.64 0 0 1 1.639-1.638z" />
        </svg>
      </div>
    );
  }

  // 4. Brave Browser
  if (lower.includes("brave")) {
    return (
      <div
        className={`${sizeClasses[size]} bg-gradient-to-tr from-[#FB542B] to-[#FF7629] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.4),2px_3px_8px_rgba(251,84,43,0.35)] ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="#FFFFFF" className={imgSizes[size]}>
          <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm-1 6h2v3h3v2h-3v5h-2v-5H8v-2h3V8z" />
        </svg>
      </div>
    );
  }

  // 5. Microsoft Edge
  if (lower.includes("edge") || lower.includes("msedge")) {
    return (
      <div
        className={`${sizeClasses[size]} bg-white dark:bg-[#1E2538] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9),2px_3px_8px_rgba(160,175,205,0.25)] dark:shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.08),2px_3px_8px_rgba(0,0,0,0.5)] border border-[#E8EEF8] dark:border-[#2A344A] ${className}`}
      >
        <svg viewBox="0 0 48 48" className={imgSizes[size]}>
          <path d="M44 24c0-11-9-20-20-20C13 4 4 13 4 24c0 10.5 8.1 19 18.5 19.9C18 39 16 33 16 27c0-7 6-12 13-12 6 0 11 3.5 13 9 1.3 3.5 2 7.3 2 10z" fill="#0C8484" />
          <path d="M44 32c-2 6-8 10-14 10-8 0-14-6-14-14 0-4 1.5-8 4-11 3 3 7 5 12 5 5 0 9.5-2 12-5v15z" fill="#0078D7" />
        </svg>
      </div>
    );
  }

  // 6. Mozilla Firefox
  if (lower.includes("firefox")) {
    return (
      <div
        className={`${sizeClasses[size]} bg-gradient-to-tr from-[#FF3B30] to-[#FF9500] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.4),2px_3px_8px_rgba(255,149,0,0.35)] ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="#FFFFFF" className={imgSizes[size]}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      </div>
    );
  }

  // 7. Visual Studio Code
  if (lower.includes("code") || lower.includes("vscode") || lower.includes("visual studio")) {
    return (
      <div
        className={`${sizeClasses[size]} bg-[#007ACC] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.4),2px_3px_8px_rgba(0,122,204,0.35)] ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="#FFFFFF" className={imgSizes[size]}>
          <path d="M18.5 2L6.8 11.2l4.8 3.8L18.5 2zm-13 8.3L2 12l3.5 1.7L9 12 5.5 10.3zm13 11.7l-6.9-5.4 4.8-3.8L18.5 22zm3.5-2.2L18 12l4-7.8L22 19.8z" />
        </svg>
      </div>
    );
  }

  // 8. Spotify
  if (lower.includes("spotify")) {
    return (
      <div
        className={`${sizeClasses[size]} bg-[#1ED760] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.4),2px_3px_8px_rgba(30,215,96,0.35)] ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="#FFFFFF" className={imgSizes[size]}>
          <path d="M12 2C6.477 2 2 6.477 2 12c0 5.524 4.477 10 10 10s10-4.476 10-10c0-5.523-4.477-10-10-10zm4.586 14.424a.623.623 0 0 1-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.625.625 0 0 1-.28-1.218c3.809-.871 7.077-.497 9.715 1.118a.625.625 0 0 1 .207.857zm1.224-2.719a.78.78 0 0 1-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.781.781 0 0 1-.462-1.492c3.632-1.103 8.147-.569 11.242 1.33a.78.78 0 0 1 .257 1.071zm.105-2.835C14.692 8.98 9.385 8.799 6.302 9.736a.936.936 0 0 1-.555-1.79c3.535-1.073 9.394-.863 13.116 1.346a.937.937 0 0 1-.948 1.578z" />
        </svg>
      </div>
    );
  }

  // 9. Telegram
  if (lower.includes("telegram")) {
    return (
      <div
        className={`${sizeClasses[size]} bg-[#2AABEE] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.4),2px_3px_8px_rgba(42,171,238,0.35)] ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="#FFFFFF" className={imgSizes[size]}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
        </svg>
      </div>
    );
  }

  // 10. Microsoft Word / Excel / PowerPoint / Office
  if (lower.includes("word") || lower.includes("winword")) {
    return (
      <div
        className={`${sizeClasses[size]} bg-[#2B579A] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.4),2px_3px_8px_rgba(43,87,154,0.35)] ${className}`}
      >
        <span className="text-white font-black text-lg">W</span>
      </div>
    );
  }
  if (lower.includes("excel")) {
    return (
      <div
        className={`${sizeClasses[size]} bg-[#217346] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.4),2px_3px_8px_rgba(33,115,70,0.35)] ${className}`}
      >
        <span className="text-white font-black text-lg">X</span>
      </div>
    );
  }
  if (lower.includes("powerpnt") || lower.includes("powerpoint")) {
    return (
      <div
        className={`${sizeClasses[size]} bg-[#D24726] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.4),2px_3px_8px_rgba(210,71,38,0.35)] ${className}`}
      >
        <span className="text-white font-black text-lg">P</span>
      </div>
    );
  }

  // 11. Notepad / Text Editor
  if (lower.includes("notepad")) {
    return (
      <div
        className={`${sizeClasses[size]} bg-gradient-to-tr from-[#3B82F6] to-[#60A5FA] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.4),2px_3px_8px_rgba(59,130,246,0.35)] ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="#FFFFFF" className={imgSizes[size]}>
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        </svg>
      </div>
    );
  }

  // 12. Calculator
  if (lower.includes("calc")) {
    return (
      <div
        className={`${sizeClasses[size]} bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.4),2px_3px_8px_rgba(99,102,241,0.35)] ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="#FFFFFF" className={imgSizes[size]}>
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-6 2h5v3h-5V5zm-6 0h5v3H7V5zm0 5h5v3H7v-3zm0 5h5v3H7v-3zm11 3h-5v-8h5v8z" />
        </svg>
      </div>
    );
  }

  // 13. Terminal / Command Prompt / PowerShell
  if (lower.includes("terminal") || lower.includes("cmd") || lower.includes("powershell")) {
    return (
      <div
        className={`${sizeClasses[size]} bg-[#1E293B] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.2),2px_3px_8px_rgba(0,0,0,0.4)] ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="#38BDF8" className={imgSizes[size]}>
          <path d="M20 4H4c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm-12 11l-1.41-1.41L9.17 11 6.59 8.41 8 7l4 4-4 4zm9 0h-6v-2h6v2z" />
        </svg>
      </div>
    );
  }

  // 14. VLC Media Player
  if (lower.includes("vlc")) {
    return (
      <div
        className={`${sizeClasses[size]} bg-[#FF8800] flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.4),2px_3px_8px_rgba(255,136,0,0.35)] ${className}`}
      >
        <svg viewBox="0 0 24 24" fill="#FFFFFF" className={imgSizes[size]}>
          <path d="M12 2L6 18h12L12 2zm-1.8 14l1.1-3.6h1.4l1.1 3.6h-3.6zm.5-5.5l.8-2.6h.9l.8 2.6h-2.5zM4 20h16v2H4z" />
        </svg>
      </div>
    );
  }

  // 15. Default High-End Windows Application Icon
  return (
    <div
      className={`${sizeClasses[size]} bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white flex items-center justify-center shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.4),2px_3px_8px_rgba(99,102,241,0.3)] ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className={imgSizes[size]}>
        <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7zm9 0h7v7h-7v-7z" />
      </svg>
    </div>
  );
};
