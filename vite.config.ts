import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { execSync } from "child_process";
import { scanWindowsApplications } from "./src/server/systemScanner";

function systemScannerPlugin(): Plugin {
  return {
    name: "system-scanner-api",
    configureServer(server) {
      server.middlewares.use("/api/system-apps", (_req, res) => {
        try {
          const apps = scanWindowsApplications();
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(JSON.stringify(apps));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: e?.message || "Failed to scan system apps" }));
        }
      });

      server.middlewares.use("/api/pick-folder", (_req, res) => {
        try {
          const script = `
Add-Type -AssemblyName System.Windows.Forms
$f = New-Object System.Windows.Forms.FolderBrowserDialog
$f.Description = "Select Folder to Protect and Lock"
$f.ShowNewFolderButton = $true
if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $f.SelectedPath
}
`;
          const selected = execSync(`powershell -NoProfile -NonInteractive -STA -Command "${script.replace(/\r?\n/g, ' ')}"`, { encoding: 'utf8' }).trim();
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(JSON.stringify({ path: selected || null }));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: e?.message || "Failed to pick folder" }));
        }
      });

      server.middlewares.use("/api/pick-executable", (_req, res) => {
        try {
          const script = `
Add-Type -AssemblyName System.Windows.Forms
$f = New-Object System.Windows.Forms.OpenFileDialog
$f.Filter = "Executable Files (*.exe)|*.exe|All Files (*.*)|*.*"
$f.Title = "Select Application to Lock"
if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $f.FileName
}
`;
          const selected = execSync(`powershell -NoProfile -NonInteractive -STA -Command "${script.replace(/\r?\n/g, ' ')}"`, { encoding: 'utf8' }).trim();
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(JSON.stringify({ path: selected || null }));
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: e?.message || "Failed to pick executable" }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), systemScannerPlugin()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Prevent vite from obscuring rust errors
  clearScreen: false,
  // Tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: "0.0.0.0",
  },
});
