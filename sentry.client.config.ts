/**
 * Sentry Client Configuration
 * Configures error tracking and monitoring for client-side errors
 */

import * as Sentry from '@sentry/nextjs';

export function initSentryClient() {
  const environment = process.env.NODE_ENV || 'development';
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!sentryDsn) {
    console.warn('[Sentry] DSN not configured, skipping initialization');
    return;
  }

  // Build integrations array
  const integrations: any[] = [];

  // Try to add replay integration if available
  try {
    const sentryAny = Sentry as any;
    if (typeof sentryAny.replayIntegration === 'function') {
      integrations.push(
        sentryAny.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        })
      );
    }
  } catch (e) {
    console.warn('[Sentry] Replay integration not available');
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    enabled: environment === 'production' || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true',

    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Network errors handled elsewhere
      'NetworkError',
      // Third-party errors to ignore
      'chrome-extension://',
      'moz-extension://',
    ],

    // Allow certain URLs
    allowUrls: [
      /https?:\/\/(www\.)?ai-match\.(com|local)/,
    ],

    // Deny certain URLs
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],

    // Integrations
    integrations,
  });
}

/**
 * Capture client-side exceptions
 */
export function captureException(error: Error | string, context?: Record<string, any>) {
  if (typeof error === 'string') {
    Sentry.captureException(new Error(error), { extra: context });
  } else {
    Sentry.captureException(error, { extra: context });
  }
}

/**
 * Capture client-side messages
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: Record<string, any>
) {
  Sentry.captureMessage(message, { level, extra: context });
}

/**
 * Set user context
 */
export function setUserContext(userId: string, email?: string, username?: string) {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

/**
 * Clear user context
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  message: string,
  category: string = 'user-action',
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  data?: Record<string, any>
) {
  Sentry.captureMessage(message, {
    level,
    breadcrumb: true,
  });

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Flush Sentry queue
 */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  return Sentry.flush(timeout);
}
