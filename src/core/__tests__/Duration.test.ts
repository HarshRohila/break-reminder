import { describe, expect, it } from 'vitest';
import { Duration } from '../domain/value-objects/Duration.js';

describe('Duration', () => {
  it('creates a duration with correct ms value', () => {
    expect(Duration.of(5_000).ms).toBe(5_000);
  });

  it('TWENTY_MIN is 1 200 000 ms', () => {
    expect(Duration.TWENTY_MIN.ms).toBe(1_200_000);
  });

  it('TWO_MIN is 120 000 ms', () => {
    expect(Duration.TWO_MIN.ms).toBe(120_000);
  });

  it('TWENTY_SEC is 20 000 ms', () => {
    expect(Duration.TWENTY_SEC.ms).toBe(20_000);
  });

  it('rejects negative ms', () => {
    expect(() => Duration.of(-1)).toThrow();
  });

  it('is immutable — ms cannot be reassigned', () => {
    const d = Duration.of(1_000);
    expect(() => {
      (d as unknown as Record<string, unknown>)['ms'] = 9_999;
    }).toThrow();
  });
});
