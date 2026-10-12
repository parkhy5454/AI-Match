/**
 * Centralized Logger
 * Uses Winston for structured logging with multiple transports
 */

import winston from 'winston';
import * as Sentry from '@sentry/nextjs';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LogContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
  [key: string]: any;
}

/**
 * Create Winston logger instance
 */
function createLogger(): winston.Logger {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

  const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
    isDevelopment
      ? winston.format.colorize()
      : winston.format.uncolorize(),
    winston.format.printf(({ timestamp, level, message, metadata, ...rest }) => {
      const meta = { ...metadata, ...rest };
      const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
      return `${timestamp} [${level.toUpperCase()}] ${message} ${metaString}`.trim();
    })
  );

  const transports: winston.transport[] = [
    // Console transport
    new winston.transports.Console({
      format: isDevelopment ? winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level}: ${message}${metaStr}`;
        })
      ) : format,
    }),

    // Error log file
    new winston.transports.File({
      filename: '/tmp/logs/error.log',
      level: 'error',
      format,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Combined log file
    new winston.transports.File({
      filename: '/tmp/logs/combined.log',
      format,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ];

  return winston.createLogger({
    level: logLevel,
    format,
    transports,
    exceptionHandlers: [
      new winston.transports.File({
        filename: '/tmp/logs/exceptions.log',
        format,
      }),
    ],
  });
}

// Global logger instance
let logger: winston.Logger | null = null;

/**
 * Get or create logger instance
 */
function getLogger(): winston.Logger {
  if (!logger) {
    logger = createLogger();
  }
  return logger;
}

/**
 * Logger interface
 */
export class AppLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = getLogger();
  }

  /**
   * Log error level
   */
  error(message: string, context?: LogContext): void {
    this.logger.error(message, { ...context });

    // Send to Sentry
    if (context?.error) {
      Sentry.captureException(context.error, {
        contexts: { log_context: context },
      });
    } else {
      Sentry.captureMessage(message, 'error', {
        contexts: { log_context: context },
      });
    }
  }

  /**
   * Log warning level
   */
  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, { ...context });

    // Send to Sentry if important
    if (context?.statusCode && context.statusCode >= 500) {
      Sentry.captureMessage(message, 'warning', {
        contexts: { log_context: context },
      });
    }
  }

  /**
   * Log info level
   */
  info(message: string, context?: LogContext): void {
    this.logger.info(message, { ...context });
  }

  /**
   * Log debug level
   */
  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, { ...context });
  }

  /**
   * Log HTTP request
   */
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userId?: string,
    requestId?: string
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    this.logger.log(level, `${method} ${path} ${statusCode} ${duration}ms`, {
      method,
      path,
      statusCode,
      duration,
      userId,
      requestId,
    });
  }

  /**
   * Log database operation
   */
  logDatabase(
    operation: string,
    model: string,
    duration: number,
    success: boolean,
    error?: Error
  ): void {
    const level = success ? 'debug' : 'error';

    this.logger.log(level, `DB ${operation} ${model} ${duration}ms`, {
      operation,
      model,
      duration,
      success,
      error: error?.message,
    });
  }

  /**
   * Log authentication event
   */
  logAuth(event: string, userId: string, success: boolean, details?: any): void {
    const level = success ? 'info' : 'warn';

    this.logger.log(level, `Auth ${event} for user ${userId}`, {
      event,
      userId,
      success,
      ...details,
    });
  }

  /**
   * Log performance metric
   */
  logPerformance(metric: string, value: number, unit: string, threshold?: number): void {
    const level = threshold && value > threshold ? 'warn' : 'debug';

    this.logger.log(level, `Performance ${metric}: ${value}${unit}`, {
      metric,
      value,
      unit,
      threshold,
    });
  }

  /**
   * Log security event
   */
  logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any): void {
    const levels: Record<string, string> = {
      low: 'info',
      medium: 'warn',
      high: 'error',
      critical: 'error',
    };

    this.logger.log(levels[severity], `Security ${event} (${severity})`, {
      event,
      severity,
      ...details,
    });

    // Send to Sentry
    Sentry.captureMessage(`Security: ${event}`, severity === 'critical' ? 'fatal' : 'error', {
      contexts: {
        security: {
          event,
          severity,
          ...details,
        },
      },
    });
  }

  /**
   * Get logger instance
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

// Global instance
export const appLogger = new AppLogger();

/**
 * Express middleware for request logging
 */
export function loggingMiddleware(req: any, res: any, next: any) {
  const startTime = Date.now();
  const requestId = req.id || req.headers['x-request-id'] || generateRequestId();

  // Add request ID to request
  req.id = requestId;

  // Track response
  const originalJson = res.json;

  res.json = function (data: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode || 200;

    appLogger.logRequest(
      req.method,
      req.path,
      statusCode,
      duration,
      req.user?.id,
      requestId
    );

    return originalJson.call(this, data);
  };

  next();
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
