import { IActivityMonitor } from '../../core/application/ports/IActivityMonitor.js';

/** Minimal interface so powerMonitor can be injected as a fake in tests. */
export interface PowerMonitorLike {
  getSystemIdleTime(): number;
}

/**
 * Polls powerMonitor.getSystemIdleTime() every second.
 * When idle time drops below the previous reading the user became active — fires the callback.
 *
 * No native addon or accessibility permissions needed; powerMonitor is built into Electron.
 */
export class ElectronActivityMonitor implements IActivityMonitor {
  private activityCallback: (() => void) | null = null;
  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private lastIdleTime = 0;

  constructor(private readonly powerMonitor: PowerMonitorLike) {}

  onActivity(callback: () => void): void {
    this.activityCallback = callback;
  }

  start(): void {
    this.lastIdleTime = this.powerMonitor.getSystemIdleTime();
    this.pollHandle = setInterval(() => {
      const idle = this.powerMonitor.getSystemIdleTime();
      if (idle < this.lastIdleTime) {
        this.activityCallback?.();
      }
      this.lastIdleTime = idle;
    }, 1_000);
  }

  stop(): void {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }
}
