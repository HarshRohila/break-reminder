/**
 * Opaque handle returned by setTimeout; pass back to clearTimeout.
 * Concrete type is determined by the implementing adapter (NodeJS.Timeout, number, etc).
 */
declare const _timerHandleBrand: unique symbol;
export type TimerHandle = { readonly [_timerHandleBrand]: never };

/**
 * Abstracts setTimeout/clearTimeout so the core has no platform dependency
 * and tests can inject a fake timer for deterministic control.
 *
 * Electron/Node implementation: wrap globalThis.setTimeout/clearTimeout with casts.
 */
export interface ITimerService {
  setTimeout(fn: () => void, ms: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
}
