import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export interface DiscoveredSystemApp {
  name: string;
  executablePath: string;
  publisher?: string;
  iconBase64?: string | null;
}

function expandEnv(str: string): string {
  if (!str) return "";
  return str
    .replace(/%SystemRoot%/gi, process.env.SystemRoot || "C:\\Windows")
    .replace(/%windir%/gi, process.env.windir || "C:\\Windows")
    .replace(/%ProgramFiles%/gi, process.env.ProgramFiles || "C:\\Program Files")
    .replace(
      /%ProgramFiles\(x86\)%/gi,
      process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)"
    )
    .replace(/%LOCALAPPDATA%/gi, process.env.LOCALAPPDATA || "")
    .replace(/%APPDATA%/gi, process.env.APPDATA || "")
    .replace(/%USERPROFILE%/gi, process.env.USERPROFILE || "C:\\Users\\Default");
}

function deriveDisplayName(exePath: string, candidateName?: string | null): string {
  if (
    candidateName &&
    !candidateName.toLowerCase().endsWith(".exe") &&
    candidateName.trim().length > 1
  ) {
    return candidateName
      .replace(/\s*\(64-bit\)/i, "")
      .replace(/\s*\(x64\)/i, "")
      .replace(/\s*\(x86\)/i, "")
      .replace(/\s*-\s*en-us/i, "")
      .replace(/\s*\(User\)/i, "")
      .trim();
  }

  const base = path.basename(exePath, path.extname(exePath)).toLowerCase();
  const map: Record<string, string> = {
    chrome: "Google Chrome",
    brave: "Brave Browser",
    msedge: "Microsoft Edge",
    firefox: "Mozilla Firefox",
    code: "Visual Studio Code",
    discord: "Discord",
    spotify: "Spotify",
    steam: "Steam",
    telegram: "Telegram",
    slack: "Slack",
    notion: "Notion",
    winword: "Microsoft Word",
    excel: "Microsoft Excel",
    powerpnt: "Microsoft PowerPoint",
    onenote: "Microsoft OneNote",
    notepad: "Notepad",
    calc: "Calculator",
    winrar: "WinRAR",
    "7zfm": "7-Zip File Manager",
    vlc: "VLC Media Player",
    mspaint: "Paint",
    snippingtool: "Snipping Tool",
    wt: "Windows Terminal",
    powershell: "Windows PowerShell",
    cmd: "Command Prompt",
    soffice: "LibreOffice",
    swriter: "LibreOffice Writer",
    scalc: "LibreOffice Calc",
    simpress: "LibreOffice Impress",
    sdraw: "LibreOffice Draw",
    sbase: "LibreOffice Base",
    wmplayer: "Windows Media Player",
    copilotapp: "Microsoft Copilot",
    canva: "Canva",
    antigravity: "Antigravity",
    "git-bash": "Git Bash",
    githubdesktop: "GitHub Desktop",
    ultraviewer_desktop: "UltraViewer",
    recordly: "Recordly",
    olk: "Outlook",
    store: "Microsoft Store",
  };

  if (map[base]) return map[base];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function isJunkApp(name: string, exePath: string): boolean {
  const lower = (name + " " + exePath).toLowerCase();
  const junkTerms = [
    "uninstall",
    "unins000",
    "redist",
    "setup",
    "installer",
    "helper",
    "service",
    "daemon",
    "host",
    "broker",
    "vcredist",
    "crashpad",
    "notification",
    "elevate",
    "ffmpeg",
    "ffprobe",
    "iediag",
    "pymanager",
    "pywmanager",
    "nativemessage",
    "childsession",
    "cursor-monitor",
    "gpu-export",
    "compositor",
    "wgc-capture",
    "whisper",
    "nmakehlp",
    "licensemanagershellext",
    "msoadfsb",
    "msoasb",
    "msoxmled",
    "sdxhelper",
    "skypeserver",
    "unopkg",
    "wabmig",
    "ssh-askpass",
    "ssh-proxy",
    "update",
    "adminserver",
    "xboxpcapp",
    "shellmcpservers",
    "pythonw",
    "pyw.exe",
    "py.exe",
    "frameview",
    "mscinres",
    "package cache",
    "windowspackagemanager",
  ];
  return junkTerms.some((term) => lower.includes(term));
}

// In-memory cache for instant zero-latency responses
let cachedApps: DiscoveredSystemApp[] | null = null;
let lastScanTime = 0;

export function scanWindowsApplications(force = false): DiscoveredSystemApp[] {
  const now = Date.now();
  if (!force && cachedApps && (now - lastScanTime < 120000)) {
    return cachedApps;
  }

  const appMap = new Map<string, DiscoveredSystemApp>();

  // 1. App Paths registry (HKLM & HKCU)
  const appPathsHives = [
    "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths",
    "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths",
  ];

  for (const hive of appPathsHives) {
    try {
      const output = execSync(`reg query "${hive}" /s`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      let currentExe: string | null = null;
      for (const line of output.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith("HKEY_")) {
          const parts = trimmed.split("\\");
          const last = parts[parts.length - 1];
          currentExe = last && last.toLowerCase().endsWith(".exe") ? last : null;
        } else if (trimmed.includes("(Default)") && currentExe) {
          const match = trimmed.match(/\(Default\)\s+REG_\w+\s+(.*)/i);
          if (match && match[1]) {
            let exe = expandEnv(match[1].trim().replace(/^"/, "").replace(/"$/, ""));
            if (fs.existsSync(exe) && exe.toLowerCase().endsWith(".exe")) {
              const name = deriveDisplayName(exe, null);
              if (!isJunkApp(name, exe)) {
                appMap.set(exe.toLowerCase(), { name, executablePath: exe });
              }
            }
          }
        }
      }
    } catch {
      // Ignored
    }
  }

  // 2. Control Panel Uninstall entries (fast recursive scan)
  const uninstallHives = [
    "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
  ];

  for (const hive of uninstallHives) {
    try {
      const output = execSync(`reg query "${hive}" /s`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });

      let currentName: string | null = null;
      let currentIcon: string | null = null;
      let currentLoc: string | null = null;
      let isSystem = false;

      const processCurrent = () => {
        if (currentName && !isSystem && !isJunkApp(currentName, "")) {
          let candidateExe: string | null = null;
          if (currentIcon) {
            const cleaned = expandEnv(
              currentIcon.split(",")[0].trim().replace(/^"/, "").replace(/"$/, "")
            );
            if (cleaned.toLowerCase().endsWith(".exe") && fs.existsSync(cleaned)) {
              candidateExe = cleaned;
            }
          }
          if (!candidateExe && currentLoc) {
            const loc = expandEnv(
              currentLoc.trim().replace(/^"/, "").replace(/"$/, "")
            );
            if (fs.existsSync(loc)) {
              try {
                const files = fs.readdirSync(loc);
                const exe = files.find(
                  (f) => f.toLowerCase().endsWith(".exe") && !isJunkApp("", f)
                );
                if (exe) candidateExe = path.join(loc, exe);
              } catch {
                // Ignored
              }
            }
          }

          if (candidateExe && !isJunkApp(currentName, candidateExe)) {
            const name = deriveDisplayName(candidateExe, currentName);
            appMap.set(candidateExe.toLowerCase(), {
              name,
              executablePath: candidateExe,
            });
          }
        }
      };

      for (const line of output.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith("HKEY_")) {
          processCurrent();
          currentName = null;
          currentIcon = null;
          currentLoc = null;
          isSystem = false;
        } else if (trimmed.startsWith("DisplayName")) {
          const m = trimmed.match(/^DisplayName\s+REG_\w+\s+(.*)/i);
          if (m) currentName = m[1].trim();
        } else if (trimmed.startsWith("DisplayIcon")) {
          const m = trimmed.match(/^DisplayIcon\s+REG_\w+\s+(.*)/i);
          if (m) currentIcon = m[1].trim();
        } else if (trimmed.startsWith("InstallLocation")) {
          const m = trimmed.match(/^InstallLocation\s+REG_\w+\s+(.*)/i);
          if (m) currentLoc = m[1].trim();
        } else if (trimmed.startsWith("SystemComponent") && /0x1/i.test(trimmed)) {
          isSystem = true;
        }
      }
      processCurrent();
    } catch {
      // Ignored
    }
  }

  // 3. Start Menu Directories
  const startMenuDirs = [
    path.join(
      process.env.ProgramData || "C:\\ProgramData",
      "Microsoft\\Windows\\Start Menu\\Programs"
    ),
    path.join(
      process.env.APPDATA || "",
      "Microsoft\\Windows\\Start Menu\\Programs"
    ),
    path.join(process.env.LOCALAPPDATA || "", "Programs"),
  ];

  for (const baseDir of startMenuDirs) {
    if (!fs.existsSync(baseDir)) continue;
    try {
      const queue = [baseDir];
      while (queue.length > 0 && queue.length < 50) {
        const cur = queue.pop()!;
        const entries = fs.readdirSync(cur, { withFileTypes: true });
        for (const ent of entries) {
          const full = path.join(cur, ent.name);
          if (ent.isDirectory()) {
            queue.push(full);
          } else if (ent.isFile() && ent.name.toLowerCase().endsWith(".exe")) {
            if (!isJunkApp(ent.name, full)) {
              const name = deriveDisplayName(full, null);
              appMap.set(full.toLowerCase(), { name, executablePath: full });
            }
          }
        }
      }
    } catch {
      // Ignored
    }
  }

  const results = Array.from(appMap.values()).filter(
    (a) => a.executablePath && fs.existsSync(a.executablePath)
  );

  results.sort((a, b) => a.name.localeCompare(b.name));
  cachedApps = results;
  lastScanTime = now;
  return results;
}
