import { ActivitySession } from '../domain/entities/ActivitySession.js';
import { BreakSession } from '../domain/entities/BreakSession.js';
import { NaturalBreakDetected } from '../domain/events/NaturalBreakDetected.js';
import { WorkTimerStarted } from '../domain/events/WorkTimerStarted.js';
import { TimerState } from '../domain/value-objects/TimerState.js';
import { BreakReminderConfig, DEFAULT_CONFIG } from './BreakReminderConfig.js';
import { IActivityMonitor } from './ports/IActivityMonitor.js';
import { IBreakUiController } from './ports/IBreakUiController.js';
import { ILogger } from './ports/ILogger.js';
import { ITimerService, TimerHandle } from './ports/ITimerService.js';

export class BreakReminderService {
  private state: TimerState = TimerState.WORKING;
  private workTimerHandle: TimerHandle | null = null;
  private idleTimerHandle: TimerHandle | null = null;
  private activitySession: ActivitySession | null = null;
  private breakSession: BreakSession | null = null;
  private cycleStartedAt: number = 0;

  constructor(
    private readonly activityMonitor: IActivityMonitor,
    private readonly timerService: ITimerService,
    private readonly breakUi: IBreakUiController,
    private readonly logger: ILogger,
    private readonly config: BreakReminderConfig = DEFAULT_CONFIG,
  ) {}

  start(): void {
    this.activityMonitor.onActivity(() => this.handleActivity());
    this.activityMonitor.start();
    this.startWorkCycle();
  }

  stop(): void {
    this.activityMonitor.stop();
    this.clearAllTimers();
  }

  getState(): TimerState {
    return this.state;
  }

  /** Milliseconds elapsed since the current WORKING or BREAK cycle began. */
  getElapsedMs(): number {
    return Date.now() - this.cycleStartedAt;
  }

  // ── Work cycle ────────────────────────────────────────────────────────────

  private startWorkCycle(): void {
    this.state = TimerState.WORKING;
    this.cycleStartedAt = Date.now();
    this.activitySession = new ActivitySession();

    const event = new WorkTimerStarted();
    this.logger.info('Work cycle started', { occurredAt: event.occurredAt });

    this.workTimerHandle = this.timerService.setTimeout(
      () => this.handleWorkTimerExpired(),
      this.config.workDuration.ms,
    );

    this.resetIdleTimer();
  }

  private handleWorkTimerExpired(): void {
    if (this.activitySession === null || !this.activitySession.isActive) return;

    const event = this.activitySession.expire();
    this.logger.info('Work timer expired — break started', { occurredAt: event.occurredAt });

    this.clearWorkTimer();
    this.state = TimerState.BREAK;
    this.cycleStartedAt = Date.now();
    this.breakUi.showBreakOverlay();

    this.breakSession = new BreakSession();
    this.resetIdleTimer();
  }

  /**
   * User-initiated break dismissal. Hides the overlay and resets the work cycle
   * exactly as if the break had completed naturally (20s idle).
   * No-op when not currently on a break.
   */
  skipBreak(): void {
    if (this.state !== TimerState.BREAK) return;
    this.handleBreakIdleComplete();
  }

  // ── Natural break (idle during WORKING) ───────────────────────────────────

  private handleNaturalBreak(): void {
    const event = new NaturalBreakDetected();
    this.logger.info('Natural break detected — resetting work cycle', { occurredAt: event.occurredAt });

    this.clearWorkTimer();
    this.startWorkCycle();
  }

  // ── Break completion (20s idle during BREAK) ──────────────────────────────

  private handleBreakIdleComplete(): void {
    if (this.breakSession === null || !this.breakSession.isActive) return;

    const event = this.breakSession.complete();
    this.logger.info('Break completed — restarting work cycle', { occurredAt: event.occurredAt });

    this.breakSession = null;
    this.breakUi.hideBreakOverlay();
    this.startWorkCycle();
  }

  // ── Activity handler ──────────────────────────────────────────────────────

  private handleActivity(): void {
    this.resetIdleTimer();
  }

  // ── Idle timer management ─────────────────────────────────────────────────

  /**
   * Clears any existing idle timer and starts a fresh one.
   * Threshold and handler differ depending on current state:
   *   WORKING → natural-break threshold (2 min)
   *   BREAK   → break-idle threshold (20 sec)
   */
  private resetIdleTimer(): void {
    if (this.idleTimerHandle !== null) {
      this.timerService.clearTimeout(this.idleTimerHandle);
      this.idleTimerHandle = null;
    }

    if (this.state === TimerState.WORKING) {
      this.idleTimerHandle = this.timerService.setTimeout(
        () => this.handleNaturalBreak(),
        this.config.naturalBreakThreshold.ms,
      );
    } else {
      this.idleTimerHandle = this.timerService.setTimeout(
        () => this.handleBreakIdleComplete(),
        this.config.breakIdleThreshold.ms,
      );
    }
  }

  // ── Timer cleanup ─────────────────────────────────────────────────────────

  private clearWorkTimer(): void {
    if (this.workTimerHandle !== null) {
      this.timerService.clearTimeout(this.workTimerHandle);
      this.workTimerHandle = null;
    }
  }

  private clearAllTimers(): void {
    this.clearWorkTimer();
    if (this.idleTimerHandle !== null) {
      this.timerService.clearTimeout(this.idleTimerHandle);
      this.idleTimerHandle = null;
    }
  }
}
