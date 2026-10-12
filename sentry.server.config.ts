/**
 * Sentry Server Configuration
 * Configures error tracking and monitoring for server-side errors
 */

import * as Sentry from '@sentry/nextjs';

export function initSentryServer() {
  const environment = process.env.NODE_ENV || 'development';
  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    console.warn('[Sentry] Server DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    enabled: environment === 'production' || process.env.SENTRY_ENABLED === 'true',

    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Release tracking
    release: process.env.APP_VERSION || '1.0.0',

    // Server-side options
    serverName: process.env.VERCEL_URL || 'localhost',

    // Ignore certain errors
    ignoreErrors: [
      // Operational errors we handle
      'UnauthorizedError',
      'ValidationError',
    ],

    // Max breadcrumbs
    maxBreadcrumbs: 50,

    // Attach stack trace
    attachStacktrace: true,

    // Before send hook for filtering
    beforeSend(event, hint) {
      // Filter out errors we don't want to track
      if (event.exception) {
        const error = hint.originalException;

        // Skip 404s in production
        if (error instanceof Error && error.message.includes('404')) {
          return null;
        }
      }

      return event;
    },
  });
}

/**
 * Capture server-side exceptions
 */
export function captureServerException(
  error: Error | string,
  context?: Record<string, any>,
  userId?: string
) {
  if (userId) {
    Sentry.setUser({ id: userId });
  }

  if (typeof error === 'string') {
    Sentry.captureException(new Error(error), { extra: context });
  } else {
    Sentry.captureException(error, { extra: context });
  }
}

/**
 * Capture server-side messages
 */
export function captureServerMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: Record<string, any>
) {
  Sentry.captureMessage(message, { level, extra: context });
}

/**
 * Add server breadcrumb
 */
export function addServerBreadcrumb(
  message: string,
  category: string = 'server',
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Flush Sentry queue
 */
export async function flushServerSentry(timeout: number = 2000): Promise<boolean> {
  return Sentry.flush(timeout);
}
