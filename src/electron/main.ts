import {
  app,
  BrowserWindow,
  ipcMain,
  nativeImage,
  powerMonitor,
  screen,
  Tray,
} from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BreakReminderService } from "../core/application/BreakReminderService.js";
import { ElectronActivityMonitor } from "./adapters/ElectronActivityMonitor.js";
import { ElectronBreakUiController } from "./adapters/ElectronBreakUiController.js";
import { ConsoleLogger } from "./adapters/ConsoleLogger.js";
import { NodeTimerService } from "./adapters/NodeTimerService.js";
import { handleGetStatus, handleCompleteBreak } from "./ipc.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Tray icon (16×16 white circle, drawn from raw RGBA bitmap) ───────────────

function makeTrayIcon(): Electron.NativeImage {
  const width = 16;
  const height = 16;
  const cx = 8;
  const cy = 8;
  const radius = 6;
  const buffer = Buffer.alloc(width * height * 4); // RGBA

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const inside = dx * dx + dy * dy <= radius * radius;
      const idx = (y * width + x) * 4;
      buffer[idx] = 255; // R
      buffer[idx + 1] = 255; // G
      buffer[idx + 2] = 255; // B
      buffer[idx + 3] = inside ? 255 : 0; // A — transparent outside circle
    }
  }

  const icon = nativeImage.createFromBitmap(buffer, {
    width,
    height,
    scaleFactor: 1.0,
  });
  // Template image: macOS renders it correctly for both light and dark menu bars
  icon.setTemplateImage(true);
  return icon;
}

// ── App singletons ────────────────────────────────────────────────────────────

let tray: Tray | null = null;
let statusWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let service: BreakReminderService | null = null;

// ── Status window ─────────────────────────────────────────────────────────────

function createStatusWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 300,
    height: 180,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  void win.loadFile(path.join(__dirname, "renderer", "index.html"));

  // Auto-hide on focus loss so it dismisses like a native popover
  win.on("blur", () => win.hide());

  return win;
}

// ── Break overlay window ──────────────────────────────────────────────────────

function createOverlayWindow(): BrowserWindow {
  const { bounds } = screen.getPrimaryDisplay();

  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    fullscreenable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Float above full-screen apps and follow the user across spaces
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  void win.loadFile(path.join(__dirname, "renderer", "overlay.html"));

  return win;
}

function toggleWindow(win: BrowserWindow): void {
  if (win.isVisible()) {
    win.hide();
    return;
  }

  // Position just below the tray icon
  const bounds = tray?.getBounds();
  if (bounds) {
    win.setPosition(
      Math.round(bounds.x + bounds.width / 2 - 150),
      Math.round(bounds.y + bounds.height + 4)
    );
  }

  win.show();
  win.focus();
}

// ── Tray ──────────────────────────────────────────────────────────────────────

function createTray(): Tray {
  const t = new Tray(makeTrayIcon());
  t.setToolTip("Break Reminder");

  t.on("click", () => statusWindow && toggleWindow(statusWindow));

  return t;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  await app.whenReady();

  // macOS: hide from Dock — tray-only app
  app.dock?.hide();

  statusWindow = createStatusWindow();
  overlayWindow = createOverlayWindow();
  tray = createTray();

  const monitor = new ElectronActivityMonitor(powerMonitor);
  const timer = new NodeTimerService();
  const breakUi = new ElectronBreakUiController(() => overlayWindow);
  const logger = new ConsoleLogger();

  service = new BreakReminderService(monitor, timer, breakUi, logger);

  ipcMain.handle("get-status", () =>
    service !== null
      ? handleGetStatus(service)
      : { state: "WORKING" as const, elapsedMs: 0 }
  );

  ipcMain.on("quit-app", () => app.quit());

  ipcMain.on("complete-break", () => {
    if (service !== null) handleCompleteBreak(service);
  });

  service.start();
}

void bootstrap();

// Intentionally empty — the tray keeps the app alive without any open windows
app.on("window-all-closed", () => {});

app.on("before-quit", () => {
  service?.stop();
});
