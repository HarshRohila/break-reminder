export class Duration {
  readonly ms: number;

  private constructor(ms: number) {
    if (ms < 0) throw new Error(`Duration must be non-negative, got ${ms}`);
    this.ms = ms;
    Object.freeze(this);
  }

  static of(ms: number): Duration {
    return new Duration(ms);
  }

  static readonly TWENTY_MIN = new Duration(20 * 60 * 1_000);
  static readonly TWO_MIN = new Duration(2 * 60 * 1_000);
  static readonly TWENTY_SEC = new Duration(20 * 1_000);
}
