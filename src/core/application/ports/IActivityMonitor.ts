/**
 * Detects keyboard/mouse activity.
 * Idle detection is handled by BreakReminderService using ITimerService,
 * so the monitor only needs to report raw activity events.
 *
 * Electron implementation: use uiohook-napi or similar global input hook.
 */
export interface IActivityMonitor {
  /** Register a callback fired on any keyboard or mouse event. */
  onActivity(callback: () => void): void;

  /** Begin listening for input events. */
  start(): void;

  /** Stop listening and clean up. */
  stop(): void;
}
