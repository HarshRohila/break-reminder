import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ElectronActivityMonitor } from '../adapters/ElectronActivityMonitor.js';

function makeMonitor(initialIdle = 0) {
  let idleSeconds = initialIdle;
  const fakeMonitor = { getSystemIdleTime: () => idleSeconds };
  const adapter = new ElectronActivityMonitor(fakeMonitor);
  const setIdle = (s: number) => { idleSeconds = s; };
  return { adapter, fakeMonitor, setIdle };
}

describe('ElectronActivityMonitor', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('does not fire onActivity when idle keeps increasing', () => {
    const { adapter, setIdle } = makeMonitor(0);
    const cb = vi.fn();
    adapter.onActivity(cb);
    adapter.start();

    setIdle(5);
    vi.advanceTimersByTime(1_000);
    setIdle(10);
    vi.advanceTimersByTime(1_000);
    setIdle(15);
    vi.advanceTimersByTime(1_000);

    expect(cb).not.toHaveBeenCalled();
    adapter.stop();
  });

  it('fires onActivity when idle time drops (user became active)', () => {
    const { adapter, setIdle } = makeMonitor(0);
    const cb = vi.fn();
    adapter.onActivity(cb);

    // idle builds up first
    setIdle(5);
    adapter.start(); // initialises lastIdleTime to 5

    // user becomes active — idle drops
    setIdle(0);
    vi.advanceTimersByTime(1_000);

    expect(cb).toHaveBeenCalledOnce();
    adapter.stop();
  });

  it('fires multiple times across multiple activity events', () => {
    const { adapter, setIdle } = makeMonitor(0);
    const cb = vi.fn();
    adapter.onActivity(cb);
    adapter.start(); // lastIdleTime = 0

    // idle builds then drops, twice
    setIdle(3);
    vi.advanceTimersByTime(1_000); // no fire (3 > 0)
    setIdle(0);
    vi.advanceTimersByTime(1_000); // fire (0 < 3)

    setIdle(7);
    vi.advanceTimersByTime(1_000); // no fire (7 > 0)
    setIdle(1);
    vi.advanceTimersByTime(1_000); // fire (1 < 7)

    expect(cb).toHaveBeenCalledTimes(2);
    adapter.stop();
  });

  it('stops firing after stop() is called', () => {
    const { adapter, setIdle } = makeMonitor(10);
    const cb = vi.fn();
    adapter.onActivity(cb);
    adapter.start();

    adapter.stop();

    setIdle(0); // would have triggered activity
    vi.advanceTimersByTime(2_000);

    expect(cb).not.toHaveBeenCalled();
  });

  it('does not throw when no activity callback is registered', () => {
    const { adapter, setIdle } = makeMonitor(5);
    adapter.start(); // no onActivity() called

    setIdle(0);
    expect(() => vi.advanceTimersByTime(1_000)).not.toThrow();
    adapter.stop();
  });
});
