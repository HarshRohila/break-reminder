import { describe, expect, it } from 'vitest';
import { handleGetStatus } from '../ipc.js';
import { TimerState } from '../../core/domain/value-objects/TimerState.js';

function makeMockService(state: TimerState, elapsedMs: number) {
  return {
    getState: () => state,
    getElapsedMs: () => elapsedMs,
  } as Parameters<typeof handleGetStatus>[0];
}

describe('handleGetStatus', () => {
  it('returns state and elapsedMs from the service', () => {
    const result = handleGetStatus(makeMockService(TimerState.WORKING, 45_000));
    expect(result).toEqual({ state: TimerState.WORKING, elapsedMs: 45_000 });
  });

  it('returns BREAK state correctly', () => {
    const result = handleGetStatus(makeMockService(TimerState.BREAK, 8_000));
    expect(result).toEqual({ state: TimerState.BREAK, elapsedMs: 8_000 });
  });

  it('result has exactly the expected keys', () => {
    const result = handleGetStatus(makeMockService(TimerState.WORKING, 0));
    expect(Object.keys(result).sort()).toEqual(['elapsedMs', 'state']);
  });

  it('elapsedMs reflects the value from the service', () => {
    const result = handleGetStatus(makeMockService(TimerState.WORKING, 999_999));
    expect(result.elapsedMs).toBe(999_999);
  });
});
