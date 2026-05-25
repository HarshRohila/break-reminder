import { beforeEach, describe, expect, it } from 'vitest';
import { BreakReminderService } from '../application/BreakReminderService.js';
import { BreakReminderConfig } from '../application/BreakReminderConfig.js';
import { Duration } from '../domain/value-objects/Duration.js';
import { TimerState } from '../domain/value-objects/TimerState.js';
import {
  FakeActivityMonitor,
  FakeBreakUiController,
  FakeLogger,
  FakeTimerService,
} from './fakes.js';

const TEST_CONFIG: BreakReminderConfig = {
  workDuration: Duration.of(1_000),
  breakIdleThreshold: Duration.of(200),
  naturalBreakThreshold: Duration.of(500),
};

function makeService() {
  const timer = new FakeTimerService();
  const monitor = new FakeActivityMonitor();
  const breakUi = new FakeBreakUiController();
  const logger = new FakeLogger();
  const service = new BreakReminderService(monitor, timer, breakUi, logger, TEST_CONFIG);
  return { timer, monitor, breakUi, logger, service };
}

describe('BreakReminderService', () => {
  describe('startup', () => {
    it('starts in WORKING state', () => {
      const { service } = makeService();
      service.start();
      expect(service.getState()).toBe(TimerState.WORKING);
    });

    it('starts the activity monitor', () => {
      const { service, monitor } = makeService();
      service.start();
      expect(monitor.isStarted).toBe(true);
    });

    it('schedules work timer and natural-break idle timer on start', () => {
      const { service, timer } = makeService();
      service.start();
      expect(timer.pendingMs).toEqual(expect.arrayContaining([1_000, 500]));
      expect(timer.pendingCount).toBe(2);
    });

    it('does not show the overlay on start', () => {
      const { service, breakUi } = makeService();
      service.start();
      expect(breakUi.showCount).toBe(0);
    });
  });

  describe('work timer expiry', () => {
    let ctx: ReturnType<typeof makeService>;

    beforeEach(() => {
      ctx = makeService();
      ctx.service.start();
    });

    it('transitions to BREAK when work timer fires', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
      expect(ctx.service.getState()).toBe(TimerState.BREAK);
    });

    it('shows the break overlay when work timer fires', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
      expect(ctx.breakUi.showCount).toBe(1);
    });

    it('replaces the natural-break idle timer with a break-idle timer', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
      expect(ctx.timer.pendingMs).toEqual([TEST_CONFIG.breakIdleThreshold.ms]);
    });
  });

  describe('break completion via 20s idle', () => {
    let ctx: ReturnType<typeof makeService>;

    beforeEach(() => {
      ctx = makeService();
      ctx.service.start();
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
    });

    it('returns to WORKING after consecutive idle during break', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.breakIdleThreshold.ms);
      expect(ctx.service.getState()).toBe(TimerState.WORKING);
    });

    it('hides the overlay when break completes naturally', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.breakIdleThreshold.ms);
      expect(ctx.breakUi.hideCount).toBe(1);
    });

    it('restarts work and natural-break timers after break completes', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.breakIdleThreshold.ms);
      expect(ctx.timer.pendingMs).toEqual(
        expect.arrayContaining([TEST_CONFIG.workDuration.ms, TEST_CONFIG.naturalBreakThreshold.ms]),
      );
    });

    it('shows overlay only once per work cycle', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.breakIdleThreshold.ms);
      expect(ctx.breakUi.showCount).toBe(1);
    });
  });

  describe('skipBreak()', () => {
    let ctx: ReturnType<typeof makeService>;

    beforeEach(() => {
      ctx = makeService();
      ctx.service.start();
    });

    it('is a no-op while in WORKING state', () => {
      const beforeMs = [...ctx.timer.pendingMs].sort((a, b) => a - b);
      ctx.service.skipBreak();
      expect(ctx.service.getState()).toBe(TimerState.WORKING);
      expect(ctx.breakUi.hideCount).toBe(0);
      expect([...ctx.timer.pendingMs].sort((a, b) => a - b)).toEqual(beforeMs);
    });

    it('returns to WORKING immediately when called during BREAK', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
      ctx.service.skipBreak();
      expect(ctx.service.getState()).toBe(TimerState.WORKING);
    });

    it('hides the overlay when called during BREAK', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
      ctx.service.skipBreak();
      expect(ctx.breakUi.hideCount).toBe(1);
    });

    it('restarts the full work cycle (work + natural-break timers) after skip', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
      ctx.service.skipBreak();
      expect(ctx.timer.pendingMs).toEqual(
        expect.arrayContaining([
          TEST_CONFIG.workDuration.ms,
          TEST_CONFIG.naturalBreakThreshold.ms,
        ]),
      );
    });

    it('a second skipBreak() during the new WORKING cycle is a no-op', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
      ctx.service.skipBreak();
      const beforeMs = [...ctx.timer.pendingMs].sort((a, b) => a - b);
      ctx.service.skipBreak();
      expect(ctx.service.getState()).toBe(TimerState.WORKING);
      expect([...ctx.timer.pendingMs].sort((a, b) => a - b)).toEqual(beforeMs);
    });
  });

  describe('activity during break resets idle timer', () => {
    let ctx: ReturnType<typeof makeService>;

    beforeEach(() => {
      ctx = makeService();
      ctx.service.start();
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
    });

    it('still has one idle timer after activity during break', () => {
      ctx.monitor.triggerActivity();
      expect(ctx.timer.pendingCount).toBe(1);
      expect(ctx.timer.pendingMs).toEqual([TEST_CONFIG.breakIdleThreshold.ms]);
    });

    it('completing the reset idle timer ends the break', () => {
      ctx.monitor.triggerActivity();
      ctx.timer.triggerByMs(TEST_CONFIG.breakIdleThreshold.ms);
      expect(ctx.service.getState()).toBe(TimerState.WORKING);
    });

    it('stays in BREAK if activity keeps interrupting idle', () => {
      ctx.monitor.triggerActivity();
      ctx.monitor.triggerActivity();
      ctx.monitor.triggerActivity();
      expect(ctx.service.getState()).toBe(TimerState.BREAK);
    });
  });

  describe('natural break (idle during WORKING)', () => {
    let ctx: ReturnType<typeof makeService>;

    beforeEach(() => {
      ctx = makeService();
      ctx.service.start();
    });

    it('stays in WORKING state after natural break', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.naturalBreakThreshold.ms);
      expect(ctx.service.getState()).toBe(TimerState.WORKING);
    });

    it('resets the work timer after natural break', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.naturalBreakThreshold.ms);
      expect(ctx.timer.pendingMs).toEqual(
        expect.arrayContaining([TEST_CONFIG.workDuration.ms, TEST_CONFIG.naturalBreakThreshold.ms]),
      );
    });

    it('does not show the overlay on a natural break', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.naturalBreakThreshold.ms);
      expect(ctx.breakUi.showCount).toBe(0);
    });

    it('activity during WORKING resets the natural-break idle timer', () => {
      ctx.monitor.triggerActivity();
      ctx.timer.triggerByMs(TEST_CONFIG.naturalBreakThreshold.ms);
      expect(ctx.service.getState()).toBe(TimerState.WORKING);
    });
  });

  describe('stop()', () => {
    it('stops the activity monitor', () => {
      const { service, monitor } = makeService();
      service.start();
      service.stop();
      expect(monitor.isStarted).toBe(false);
    });

    it('clears all pending timers', () => {
      const { service, timer } = makeService();
      service.start();
      service.stop();
      expect(timer.pendingCount).toBe(0);
    });
  });
});
