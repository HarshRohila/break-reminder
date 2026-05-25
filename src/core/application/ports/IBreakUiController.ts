/**
 * Controls the in-app break UI (e.g. a full-screen overlay window).
 *
 * Electron implementation: show/hide a dedicated `BrowserWindow` that covers
 * the primary display while the user is on a break.
 */
export interface IBreakUiController {
  showBreakOverlay(): void;
  hideBreakOverlay(): void;
}
