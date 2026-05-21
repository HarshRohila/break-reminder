import { BreakStarted } from '../events/BreakStarted.js';

export class ActivitySession {
  private _isActive = true;

  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Transitions session to expired state.
   * Called by the service when the 20min work timer fires.
   * Returns the domain event for logging/observability.
   */
  expire(): BreakStarted {
    if (!this._isActive) {
      throw new Error('ActivitySession already expired');
    }
    this._isActive = false;
    return new BreakStarted();
  }
}
