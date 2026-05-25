import { app, BrowserWindow, ipcMain, nativeImage, powerMonitor, Tray } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BreakReminderService } from '../core/application/BreakReminderService.js';
import { ElectronActivityMonitor } from './adapters/ElectronActivityMonitor.js';
import { ElectronNotifier } from './adapters/ElectronNotifier.js';
import { ConsoleLogger } from './adapters/ConsoleLogger.js';
import { NodeTimerService } from './adapters/NodeTimerService.js';
import { handleGetStatus } from './ipc.js';

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
      buffer[idx] = 255;              // R
      buffer[idx + 1] = 255;          // G
      buffer[idx + 2] = 255;          // B
      buffer[idx + 3] = inside ? 255 : 0; // A — transparent outside circle
    }
  }

  const icon = nativeImage.createFromBitmap(buffer, { width, height, scaleFactor: 1.0 });
  // Template image: macOS renders it correctly for both light and dark menu bars
  icon.setTemplateImage(true);
  return icon;
}

// ── App singletons ────────────────────────────────────────────────────────────

let tray: Tray | null = null;
let statusWindow: BrowserWindow | null = null;
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
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  void win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Auto-hide on focus loss so it dismisses like a native popover
  win.on('blur', () => win.hide());

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
      Math.round(bounds.y + bounds.height + 4),
    );
  }

  win.show();
  win.focus();
}

// ── Tray ──────────────────────────────────────────────────────────────────────

function createTray(): Tray {
  const t = new Tray(makeTrayIcon());
  t.setToolTip('Break Reminder');

  t.on('click', () => statusWindow && toggleWindow(statusWindow));

  return t;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  await app.whenReady();

  // macOS: hide from Dock — tray-only app
  app.dock?.hide();

  statusWindow = createStatusWindow();
  tray = createTray();

  const monitor = new ElectronActivityMonitor(powerMonitor);
  const timer = new NodeTimerService();
  const notifier = new ElectronNotifier();
  const logger = new ConsoleLogger();

  service = new BreakReminderService(monitor, timer, notifier, logger);

  ipcMain.handle('get-status', () =>
    service !== null
      ? handleGetStatus(service)
      : { state: 'WORKING' as const, elapsedMs: 0 },
  );

  ipcMain.on('quit-app', () => app.quit());

  service.start();
}

void bootstrap();

// Intentionally empty — the tray keeps the app alive without any open windows
app.on('window-all-closed', () => {});

app.on('before-quit', () => {
  service?.stop();
});
