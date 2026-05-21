import { BreakCompleted } from '../events/BreakCompleted.js';

export class BreakSession {
  private _isActive = true;

  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Transitions session to completed state.
   * Called by the service when 20s consecutive idle is detected during a break.
   * Returns the domain event for logging/observability.
   */
  complete(): BreakCompleted {
    if (!this._isActive) {
      throw new Error('BreakSession already completed');
    }
    this._isActive = false;
    return new BreakCompleted();
  }
}
