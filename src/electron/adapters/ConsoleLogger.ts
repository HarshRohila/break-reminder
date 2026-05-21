import { ILogger } from '../../core/application/ports/ILogger.js';

export class ConsoleLogger implements ILogger {
  info(msg: string, context?: Record<string, unknown>): void {
    console.log(`[INFO] ${msg}`, context !== undefined ? context : '');
  }

  warn(msg: string, context?: Record<string, unknown>): void {
    console.warn(`[WARN] ${msg}`, context !== undefined ? context : '');
  }

  error(msg: string, context?: Record<string, unknown>): void {
    console.error(`[ERROR] ${msg}`, context !== undefined ? context : '');
  }
}
