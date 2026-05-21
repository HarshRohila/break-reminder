import { describe, expect, it } from 'vitest';
import { ActivitySession } from '../domain/entities/ActivitySession.js';
import { BreakStarted } from '../domain/events/BreakStarted.js';

describe('ActivitySession', () => {
  it('is active on creation', () => {
    const session = new ActivitySession();
    expect(session.isActive).toBe(true);
  });

  it('expire() returns a BreakStarted event', () => {
    const session = new ActivitySession();
    const event = session.expire();
    expect(event).toBeInstanceOf(BreakStarted);
  });

  it('expire() records an occurredAt timestamp', () => {
    const before = new Date();
    const event = new ActivitySession().expire();
    const after = new Date();
    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('isActive is false after expire()', () => {
    const session = new ActivitySession();
    session.expire();
    expect(session.isActive).toBe(false);
  });

  it('expire() throws when called on an already-expired session', () => {
    const session = new ActivitySession();
    session.expire();
    expect(() => session.expire()).toThrow('ActivitySession already expired');
  });
});
