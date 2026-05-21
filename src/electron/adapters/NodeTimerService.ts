import { ITimerService, TimerHandle } from '../../core/application/ports/ITimerService.js';

export class NodeTimerService implements ITimerService {
  setTimeout(fn: () => void, ms: number): TimerHandle {
    return globalThis.setTimeout(fn, ms) as unknown as TimerHandle;
  }

  clearTimeout(handle: TimerHandle): void {
    globalThis.clearTimeout(handle as unknown as ReturnType<typeof globalThis.setTimeout>);
  }
}
