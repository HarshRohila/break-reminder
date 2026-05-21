# Break Reminder — Core Domain

Pure TypeScript core. Zero dependencies. Platform concerns (Electron, OS notifications, input monitoring) connect via interfaces defined here.

---

## The 20-20-20 Rule

Every 20 minutes of screen activity → look at something 20 feet away for 20 seconds.

This app enforces it by:
1. Tracking 20 min of activity.
2. Notifying user when timer expires.
3. Requiring 20 consecutive seconds of keyboard+mouse inactivity to confirm break taken.
4. Restarting the 20 min work cycle.

---

## Domain States (`TimerState`)

```
WORKING → BREAK → WORKING → ...
   ↑ (natural break resets timer, stays WORKING)
```

Two states only:

| State | Meaning | Enters when | Exits when |
|-------|---------|-------------|------------|
| `WORKING` | User is active, 20min timer counting down | App starts / break completed / natural break detected | Work timer hits 20min |
| `BREAK` | 20min expired, waiting for user to rest | Work timer fires | 20s consecutive idle detected |

Natural break (idle during `WORKING`) does not change state. `ActivitySession` resets its own timer internally and fires `NaturalBreakDetected` — state stays `WORKING` throughout.

---

## Domain Entities

### `ActivitySession`
Represents one active work cycle.

- Owns the 20min countdown.
- On every user activity event: resets natural-break idle counter.
- On idle ≥ natural-break-threshold during work cycle: fires `NaturalBreakDetected` → self-resets.
- On 20min expiry: fires `BreakStarted`.

### `BreakSession`
Represents one break window.

- Begins when `BreakStarted` event received.
- Tracks consecutive idle time using a rolling counter.
- Any activity during break: resets idle counter to 0.
- On 20s consecutive idle: fires `BreakCompleted`.

---

## Domain Events

| Event | Fired by | Consumed by |
|-------|----------|-------------|
| `WorkTimerStarted` | `BreakReminderService` | Logger / UI |
| `BreakStarted` | `ActivitySession` | `BreakReminderService` → triggers notifier |
| `BreakCompleted` | `BreakSession` | `BreakReminderService` → restarts work cycle |
| `NaturalBreakDetected` | `ActivitySession` | `BreakReminderService` → resets work timer |

---

## Value Objects

### `Duration`
Immutable millisecond wrapper. Named constants:
- `Duration.TWENTY_MIN` = 20 × 60 × 1000 ms
- `Duration.TWO_MIN` = 2 × 60 × 1000 ms
- `Duration.TWENTY_SEC` = 20 × 1000 ms

### `TimerState`
Enum: `WORKING | BREAK`

---

## Port Interfaces (what Electron must implement)

These are the contracts the core exposes. Electron (or any adapter) provides concrete classes.

### `IActivityMonitor`
Detects keyboard/mouse activity. Idle detection is handled inside `BreakReminderService` using `ITimerService` (reset-on-activity pattern), so the monitor only reports raw input events.

```
onActivity(callback: () => void): void
start(): void
stop(): void
```

### `ITimerService`
Abstracts `setTimeout` / `clearTimeout` so core has no dependency on Node or browser globals.

```
setTimeout(fn: () => void, ms: number): TimerHandle
clearTimeout(handle: TimerHandle): void
```

### `INotifier`
Sends OS-level notification to user.

```
notify(title: string, body: string): void
```

### `ILogger`
Structured logging abstraction.

```
info(msg: string, context?: Record<string, unknown>): void
warn(msg: string, context?: Record<string, unknown>): void
error(msg: string, context?: Record<string, unknown>): void
```

---

## Application Layer

### `BreakReminderService`
Central orchestrator. Owns state machine. Wires entities ↔ events ↔ ports.

Constructed with:
```
new BreakReminderService(activityMonitor, timerService, notifier, logger, config?)
```

Optional `config`:
- `workDuration` — default `Duration.TWENTY_MIN`
- `breakIdleThreshold` — default `Duration.TWENTY_SEC`
- `naturalBreakThreshold` — default `Duration.TWO_MIN`

### Use-case logic (private methods of `BreakReminderService`)

| Method | Trigger | Action |
|--------|---------|--------|
| `startWorkCycle()` | App start / break done / natural break | Creates `ActivitySession`, schedules work + natural-break idle timers |
| `handleActivity()` | Any input event | Resets idle timer with current-state threshold |
| `handleWorkTimerExpired()` | Work timer fires | Expires `ActivitySession`, notifies, creates `BreakSession`, resets idle timer for break |
| `handleNaturalBreak()` | Idle ≥ 2 min during `WORKING` | Fires `NaturalBreakDetected`, restarts work cycle |
| `handleBreakIdleComplete()` | Idle ≥ 20s during `BREAK` | Completes `BreakSession`, fires `BreakCompleted`, restarts work cycle |

---

## Wiring Guide (Electron adapter, future step)

1. Implement `IActivityMonitor` using `uiohook-napi` or similar.
2. Implement `ITimerService` wrapping Node's `setTimeout`.
3. Implement `INotifier` using Electron's `Notification` API.
4. Implement `ILogger` wrapping `console` or a file logger.
5. Construct `BreakReminderService` with all four adapters.
6. Call `service.start()` in Electron's `app.whenReady()`.

---

## Folder Structure

```
src/
  core/
    domain/
      entities/
        ActivitySession.ts
        BreakSession.ts
      value-objects/
        Duration.ts
        TimerState.ts
      events/
        DomainEvent.ts
        WorkTimerStarted.ts
        BreakStarted.ts
        BreakCompleted.ts
        NaturalBreakDetected.ts
    application/
      ports/
        IActivityMonitor.ts
        INotifier.ts
        ITimerService.ts
        ILogger.ts
      BreakReminderConfig.ts
      BreakReminderService.ts
    __tests__/
      fakes.ts                      ← fake implementations for all ports
      Duration.test.ts
      ActivitySession.test.ts
      BreakSession.test.ts
      BreakReminderService.test.ts
```
