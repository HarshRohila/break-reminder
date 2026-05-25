import { describe, expect, it, vi } from 'vitest';
import { handleSkipBreak } from '../ipc.js';

function makeMockService() {
  return {
    skipBreak: vi.fn(),
  } as unknown as Parameters<typeof handleSkipBreak>[0] & { skipBreak: ReturnType<typeof vi.fn> };
}

describe('handleSkipBreak', () => {
  it('delegates to service.skipBreak()', () => {
    const service = makeMockService();
    handleSkipBreak(service);
    expect(service.skipBreak).toHaveBeenCalledTimes(1);
  });

  it('returns void', () => {
    const service = makeMockService();
    const result = handleSkipBreak(service);
    expect(result).toBeUndefined();
  });

  it('forwards repeated calls one-for-one', () => {
    const service = makeMockService();
    handleSkipBreak(service);
    handleSkipBreak(service);
    handleSkipBreak(service);
    expect(service.skipBreak).toHaveBeenCalledTimes(3);
  });
});
