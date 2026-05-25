import { BreakReminderService } from '../core/application/BreakReminderService.js';
import { TimerState } from '../core/domain/value-objects/TimerState.js';

export interface StatusResponse {
  state: TimerState;
  elapsedMs: number;
}

/**
 * Pure handler function — no Electron imports, fully testable.
 * Register in main.ts: ipcMain.handle('get-status', () => handleGetStatus(service))
 */
export function handleGetStatus(service: BreakReminderService): StatusResponse {
  return {
    state: service.getState(),
    elapsedMs: service.getElapsedMs(),
  };
}

/**
 * Pure handler function — no Electron imports, fully testable.
 * Register in main.ts: ipcMain.on('skip-break', () => handleSkipBreak(service))
 */
export function handleSkipBreak(service: BreakReminderService): void {
  service.skipBreak();
}
