import { beforeEach, describe, expect, it } from "vitest";
import { BreakReminderService } from "../application/BreakReminderService.js";
import { BreakReminderConfig } from "../application/BreakReminderConfig.js";
import { Duration } from "../domain/value-objects/Duration.js";
import { TimerState } from "../domain/value-objects/TimerState.js";
import {
  FakeActivityMonitor,
  FakeBreakUiController,
  FakeLogger,
  FakeTimerService,
} from "./fakes.js";

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
  const service = new BreakReminderService(
    monitor,
    timer,
    breakUi,
    logger,
    TEST_CONFIG
  );
  return { timer, monitor, breakUi, logger, service };
}

describe("BreakReminderService", () => {
  describe("startup", () => {
    it("starts in WORKING state", () => {
      const { service } = makeService();
      service.start();
      expect(service.getState()).toBe(TimerState.WORKING);
    });

    it("starts the activity monitor", () => {
      const { service, monitor } = makeService();
      service.start();
      expect(monitor.isStarted).toBe(true);
    });

    it("schedules work timer and natural-break idle timer on start", () => {
      const { service, timer } = makeService();
      service.start();
      expect(timer.pendingMs).toEqual(expect.arrayContaining([1_000, 500]));
      expect(timer.pendingCount).toBe(2);
    });

    it("does not show the overlay on start", () => {
      const { service, breakUi } = makeService();
      service.start();
      expect(breakUi.showCount).toBe(0);
    });
  });

  describe("work timer expiry", () => {
    let ctx: ReturnType<typeof makeService>;

    beforeEach(() => {
      ctx = makeService();
      ctx.service.start();
    });

    it("transitions to BREAK when work timer fires", () => {
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
      expect(ctx.service.getState()).toBe(TimerState.BREAK);
    });

    it("shows the break overlay when work timer fires", () => {
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
      expect(ctx.breakUi.showCount).toBe(1);
    });
  });

  describe("completeBreak()", () => {
    let ctx: ReturnType<typeof makeService>;

    beforeEach(() => {
      ctx = makeService();
      ctx.service.start();
    });

    it("returns to WORKING immediately when called during BREAK", () => {
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
      ctx.service.completeBreak();
      expect(ctx.service.getState()).toBe(TimerState.WORKING);
    });

    it("hides the overlay when called during BREAK", () => {
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
      ctx.service.completeBreak();
      expect(ctx.breakUi.hideCount).toBe(1);
    });

    it("restarts the full work cycle (work + natural-break timers) after complete", () => {
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
      ctx.service.completeBreak();
      expect(ctx.timer.pendingMs).toEqual(
        expect.arrayContaining([
          TEST_CONFIG.workDuration.ms,
          TEST_CONFIG.naturalBreakThreshold.ms,
        ])
      );
    });
  });

  describe("activity during break resets idle timer", () => {
    let ctx: ReturnType<typeof makeService>;

    beforeEach(() => {
      ctx = makeService();
      ctx.service.start();
      ctx.timer.triggerByMs(TEST_CONFIG.workDuration.ms);
    });

    it("stays in BREAK if activity keeps interrupting idle", () => {
      ctx.monitor.triggerActivity();
      ctx.monitor.triggerActivity();
      ctx.monitor.triggerActivity();
      expect(ctx.service.getState()).toBe(TimerState.BREAK);
    });
  });

  describe("natural break (idle during WORKING)", () => {
    let ctx: ReturnType<typeof makeService>;

    beforeEach(() => {
      ctx = makeService();
      ctx.service.start();
    });

    it("stays in WORKING state after natural break", () => {
      ctx.timer.triggerByMs(TEST_CONFIG.naturalBreakThreshold.ms);
      expect(ctx.service.getState()).toBe(TimerState.WORKING);
    });

    it("resets the work timer after natural break", () => {
      ctx.timer.triggerByMs(TEST_CONFIG.naturalBreakThreshold.ms);
      expect(ctx.timer.pendingMs).toEqual(
        expect.arrayContaining([
          TEST_CONFIG.workDuration.ms,
          TEST_CONFIG.naturalBreakThreshold.ms,
        ])
      );
    });

    it("does not show the overlay on a natural break", () => {
      ctx.timer.triggerByMs(TEST_CONFIG.naturalBreakThreshold.ms);
      expect(ctx.breakUi.showCount).toBe(0);
    });

    it("activity during WORKING resets the natural-break idle timer", () => {
      ctx.monitor.triggerActivity();
      ctx.timer.triggerByMs(TEST_CONFIG.naturalBreakThreshold.ms);
      expect(ctx.service.getState()).toBe(TimerState.WORKING);
    });
  });

  describe("stop()", () => {
    it("stops the activity monitor", () => {
      const { service, monitor } = makeService();
      service.start();
      service.stop();
      expect(monitor.isStarted).toBe(false);
    });

    it("clears all pending timers", () => {
      const { service, timer } = makeService();
      service.start();
      service.stop();
      expect(timer.pendingCount).toBe(0);
    });
  });
});
