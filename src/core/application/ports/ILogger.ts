/**
 * Structured logging abstraction.
 *
 * Electron implementation: wrap console or a file-based logger.
 */
export interface ILogger {
  info(msg: string, context?: Record<string, unknown>): void;
  warn(msg: string, context?: Record<string, unknown>): void;
  error(msg: string, context?: Record<string, unknown>): void;
}
