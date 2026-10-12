/**
 * Logging Module Exports
 * Centralized logging system using Winston
 */

import { appLogger } from './logger';

export { AppLogger, loggingMiddleware } from './logger';
export { appLogger } from './logger';
export type { LogLevel, LogContext } from './logger';

// Export appLogger as 'logger' for compatibility with existing code
export { appLogger as logger };
