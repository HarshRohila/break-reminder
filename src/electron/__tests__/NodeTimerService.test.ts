import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeTimerService } from '../adapters/NodeTimerService.js';

describe('NodeTimerService', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('fires the callback after the given delay', () => {
    const service = new NodeTimerService();
    const fn = vi.fn();
    service.setTimeout(fn, 1_000);
    vi.advanceTimersByTime(1_000);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('does not fire after clearTimeout', () => {
    const service = new NodeTimerService();
    const fn = vi.fn();
    const handle = service.setTimeout(fn, 1_000);
    service.clearTimeout(handle);
    vi.advanceTimersByTime(1_000);
    expect(fn).not.toHaveBeenCalled();
  });

  it('fires the correct callback when multiple timers are pending', () => {
    const service = new NodeTimerService();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    service.setTimeout(fn1, 500);
    service.setTimeout(fn2, 1_000);
    vi.advanceTimersByTime(500);
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(fn2).toHaveBeenCalledOnce();
  });
});
