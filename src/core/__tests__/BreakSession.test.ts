import { describe, expect, it } from 'vitest';
import { BreakSession } from '../domain/entities/BreakSession.js';
import { BreakCompleted } from '../domain/events/BreakCompleted.js';

describe('BreakSession', () => {
  it('is active on creation', () => {
    expect(new BreakSession().isActive).toBe(true);
  });

  it('complete() returns a BreakCompleted event', () => {
    const event = new BreakSession().complete();
    expect(event).toBeInstanceOf(BreakCompleted);
  });

  it('complete() records an occurredAt timestamp', () => {
    const before = new Date();
    const event = new BreakSession().complete();
    const after = new Date();
    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('isActive is false after complete()', () => {
    const session = new BreakSession();
    session.complete();
    expect(session.isActive).toBe(false);
  });

  it('complete() throws when called on an already-completed session', () => {
    const session = new BreakSession();
    session.complete();
    expect(() => session.complete()).toThrow('BreakSession already completed');
  });
});
