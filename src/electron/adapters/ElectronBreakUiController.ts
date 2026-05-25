import { BrowserWindow } from 'electron';
import { IBreakUiController } from '../../core/application/ports/IBreakUiController.js';

/**
 * Shows/hides a full-screen overlay BrowserWindow.
 *
 * The window is resolved lazily via `getWindow` so the adapter can be
 * constructed before the window itself is created during app bootstrap.
 */
export class ElectronBreakUiController implements IBreakUiController {
  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  showBreakOverlay(): void {
    const win = this.getWindow();
    if (win === null || win.isDestroyed()) return;
    win.show();
    win.focus();
  }

  hideBreakOverlay(): void {
    const win = this.getWindow();
    if (win === null || win.isDestroyed()) return;
    win.hide();
  }
}
