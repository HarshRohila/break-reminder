import { Duration } from '../domain/value-objects/Duration.js';

export interface BreakReminderConfig {
  /** How long the user must work before a break is triggered. Default: 20 min. */
  workDuration: Duration;
  /** How long the user must be idle during a break for it to count as completed. Default: 20 sec. */
  breakIdleThreshold: Duration;
  /** How long the user must be idle during WORKING for it to count as a natural break (resets work timer). Default: 2 min. */
  naturalBreakThreshold: Duration;
}

export const DEFAULT_CONFIG: BreakReminderConfig = {
  workDuration: Duration.TWENTY_MIN,
  breakIdleThreshold: Duration.TWENTY_SEC,
  naturalBreakThreshold: Duration.TWO_MIN,
};
