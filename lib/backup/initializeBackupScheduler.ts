/**
 * Initialize Backup Scheduler
 * Sets up automated backup scheduling on server startup
 */

import { BackupScheduler } from './backupScheduler';

let backupScheduler: BackupScheduler | null = null;

/**
 * Initialize and start the backup scheduler
 */
export async function initializeBackupScheduler(): Promise<void> {
  if (typeof window !== 'undefined') {
    // Don't run on client side
    return;
  }

  try {
    const databaseUrl = process.env.DATABASE_URL;
    const s3Bucket = process.env.BACKUP_S3_BUCKET;
    const s3Region = process.env.AWS_REGION || 'ap-northeast-2';
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const cronSchedule = process.env.BACKUP_CRON || '0 0 * * *'; // Default: daily at midnight
    const enableBackup = process.env.BACKUP_ENABLED === 'true';
    const slackWebhook = process.env.BACKUP_SLACK_WEBHOOK;
    const emailOnFailure = process.env.BACKUP_EMAIL_ON_FAILURE;

    // Skip initialization if not enabled
    if (!enableBackup || !databaseUrl) {
      console.log('[BackupScheduler] Backup scheduler is disabled or database URL not configured');
      return;
    }

    // Check required configuration
    if (!s3Bucket || !awsAccessKeyId || !awsSecretAccessKey) {
      console.warn('[BackupScheduler] S3 backup storage not configured, backup will only be saved locally');
    }

    backupScheduler = new BackupScheduler({
      databaseUrl,
      s3Bucket: s3Bucket || 'ai-match-backups',
      s3Region,
      awsAccessKeyId: awsAccessKeyId || '',
      awsSecretAccessKey: awsSecretAccessKey || '',
      cronSchedule,
      enableNotifications: !!slackWebhook,
      slackWebhook,
      emailOnFailure,
    });

    // Start the scheduler
    backupScheduler.start();

    console.log('[BackupScheduler] Backup scheduler initialized successfully');

    // Log next backup time
    const nextBackup = backupScheduler.getNextBackupTime();
    if (nextBackup) {
      console.log(`[BackupScheduler] Next backup scheduled for: ${nextBackup.toISOString()}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[BackupScheduler] Error initializing backup scheduler: ${errorMsg}`);
    // Don't throw - allow app to continue even if backup scheduling fails
  }
}

/**
 * Get the backup scheduler instance
 */
export function getBackupScheduler(): BackupScheduler | null {
  return backupScheduler;
}

/**
 * Stop the backup scheduler
 */
export async function stopBackupScheduler(): Promise<void> {
  if (backupScheduler) {
    await backupScheduler.close();
    backupScheduler = null;
    console.log('[BackupScheduler] Backup scheduler stopped');
  }
}

/**
 * Run a manual backup
 */
export async function runManualBackup(): Promise<any> {
  if (!backupScheduler) {
    throw new Error('Backup scheduler not initialized');
  }

  return backupScheduler.runBackup();
}

/**
 * Get backup scheduler status
 */
export function getBackupSchedulerStatus(): any {
  if (!backupScheduler) {
    return {
      initialized: false,
      error: 'Backup scheduler not initialized',
    };
  }

  return {
    initialized: true,
    ...backupScheduler.getStatus(),
  };
}
