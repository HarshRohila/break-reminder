import { IActivityMonitor } from '../application/ports/IActivityMonitor.js';
import { IBreakUiController } from '../application/ports/IBreakUiController.js';
import { ILogger } from '../application/ports/ILogger.js';
import { ITimerService, TimerHandle } from '../application/ports/ITimerService.js';

// ── FakeTimerService ──────────────────────────────────────────────────────────

interface PendingTimer {
  handle: TimerHandle;
  fn: () => void;
  ms: number;
}

export class FakeTimerService implements ITimerService {
  private _timers: PendingTimer[] = [];
  private _counter = 0;

  setTimeout(fn: () => void, ms: number): TimerHandle {
    const handle = { __id: this._counter++ } as unknown as TimerHandle;
    this._timers.push({ handle, fn, ms });
    return handle;
  }

  clearTimeout(handle: TimerHandle): void {
    this._timers = this._timers.filter((t) => t.handle !== handle);
  }

  /** Fire the first pending timer that has exactly this duration. */
  triggerByMs(ms: number): void {
    const idx = this._timers.findIndex((t) => t.ms === ms);
    if (idx === -1) throw new Error(`No pending timer with ms=${ms}`);
    const [timer] = this._timers.splice(idx, 1);
    timer!.fn();
  }

  /** Number of pending (not-yet-fired, not-cleared) timers. */
  get pendingCount(): number {
    return this._timers.length;
  }

  /** All pending timer durations, useful for assertions. */
  get pendingMs(): number[] {
    return this._timers.map((t) => t.ms);
  }
}

// ── FakeActivityMonitor ───────────────────────────────────────────────────────

export class FakeActivityMonitor implements IActivityMonitor {
  private _activityCallback: (() => void) | null = null;
  private _started = false;

  onActivity(callback: () => void): void {
    this._activityCallback = callback;
  }

  start(): void {
    this._started = true;
  }

  stop(): void {
    this._started = false;
  }

  /** Simulate keyboard/mouse event. */
  triggerActivity(): void {
    if (this._activityCallback === null) throw new Error('No activity callback registered');
    this._activityCallback();
  }

  get isStarted(): boolean {
    return this._started;
  }
}

// ── FakeBreakUiController ─────────────────────────────────────────────────────

export class FakeBreakUiController implements IBreakUiController {
  readonly calls: Array<'show' | 'hide'> = [];

  showBreakOverlay(): void {
    this.calls.push('show');
  }

  hideBreakOverlay(): void {
    this.calls.push('hide');
  }

  get showCount(): number {
    return this.calls.filter((c) => c === 'show').length;
  }

  get hideCount(): number {
    return this.calls.filter((c) => c === 'hide').length;
  }
}

// ── FakeLogger ────────────────────────────────────────────────────────────────

export class FakeLogger implements ILogger {
  readonly entries: Array<{ level: string; msg: string }> = [];

  info(msg: string): void {
    this.entries.push({ level: 'info', msg });
  }

  warn(msg: string): void {
    this.entries.push({ level: 'warn', msg });
  }

  error(msg: string): void {
    this.entries.push({ level: 'error', msg });
  }
}
