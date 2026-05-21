import { beforeEach, describe, expect, it } from 'vitest';
import { BreakReminderService } from '../application/BreakReminderService.js';
import { BreakReminderConfig } from '../application/BreakReminderConfig.js';
import { Duration } from '../domain/value-objects/Duration.js';
import { TimerState } from '../domain/value-objects/TimerState.js';
import { FakeActivityMonitor, FakeLogger, FakeNotifier, FakeTimerService } from './fakes.js';

// Use small durations so tests read clearly without magic numbers
const TEST_CONFIG: BreakReminderConfig = {
  workDuration: Duration.of(1_000),
  breakIdleThreshold: Duration.of(200),
  naturalBreakThreshold: Duration.of(500),
};

function makeService() {
  const timer = new FakeTimerService();
  const monitor = new FakeActivityMonitor();
  const notifier = new FakeNotifier();
  const logger = new FakeLogger();
  const service = new BreakReminderService(monitor, timer, notifier, logger, TEST_CONFIG);
  return { timer, monitor, notifier, logger, service };
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
      // work timer (1000ms) + natural-break idle timer (500ms)
      expect(timer.pendingMs).toEqual(expect.arrayContaining([1_000, 500]));
      expect(timer.pendingCount).toBe(2);
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

    it('sends a notification when work timer fires', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
      expect(ctx.notifier.callCount).toBe(1);
      expect(ctx.notifier.lastNotification?.title).toBe('Time for a break!');
    });

    it('replaces the natural-break idle timer with a break-idle timer', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
      // only the break idle timer (200ms) should remain — work timer consumed itself
      expect(ctx.timer.pendingMs).toEqual([TEST_CONFIG.breakIdleThreshold.ms]);
    });
  });

  describe('break completion', () => {
    let ctx: ReturnType<typeof makeService>;

    beforeEach(() => {
      ctx = makeService();
      ctx.service.start();
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms); // enter BREAK
    });

    it('returns to WORKING after 20s consecutive idle during break', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.breakIdleThreshold.ms);
      expect(ctx.service.getState()).toBe(TimerState.WORKING);
    });

    it('restarts work and natural-break timers after break completes', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.breakIdleThreshold.ms);
      expect(ctx.timer.pendingMs).toEqual(
        expect.arrayContaining([TEST_CONFIG.workDuration.ms, TEST_CONFIG.naturalBreakThreshold.ms]),
      );
    });

    it('sends only one notification per work cycle', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.breakIdleThreshold.ms);
      expect(ctx.notifier.callCount).toBe(1);
    });
  });

  describe('activity during break resets idle timer', () => {
    let ctx: ReturnType<typeof makeService>;

    beforeEach(() => {
      ctx = makeService();
      ctx.service.start();
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms); // enter BREAK
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

    it('does not send a notification for a natural break', () => {
      ctx.timer.triggerByMs(TEST_CONFIG.naturalBreakThreshold.ms);
      expect(ctx.notifier.callCount).toBe(0);
    });

    it('activity during WORKING resets the natural-break idle timer', () => {
      ctx.monitor.triggerActivity();
      // idle timer was replaced; triggering it still results in natural break, not crash
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
