/**
 * Next.js Instrumentation Hook
 * Runs automatically when the app starts (both server and client)
 */

export async function register() {
  // Server-side initialization
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize Logger
    const { appLogger } = await import('./lib/logging');
    appLogger.info('Application initialization started', {
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
    });

    // Initialize Sentry
    const { initSentryServer } = await import('./sentry.server.config');
    initSentryServer();
    appLogger.info('Sentry server-side initialization complete');

    // Initialize Backup Scheduler
    const { initializeBackupScheduler } = await import('./lib/backup/initializeBackupScheduler');
    await initializeBackupScheduler();
    appLogger.info('Backup scheduler initialization complete');

    // Log application ready
    appLogger.info('Application initialization complete', {
      timestamp: new Date().toISOString(),
    });
  }

  // Edge runtime initialization (API routes)
  if (process.env.NEXT_RUNTIME === 'edge') {
    console.log('[Sentry] Edge runtime detected, using limited Sentry features');
  }
}
