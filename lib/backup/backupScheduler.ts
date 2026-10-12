/**
 * Database Backup Scheduler
 * Schedules and manages automated database backups using cron
 */

import cron from 'node-cron';
import { BackupService, BackupConfig, BackupResult } from './backupService';
import * as fs from 'fs';

export interface SchedulerConfig extends BackupConfig {
  cronSchedule: string; // Cron expression (e.g., "0 0 * * *" for daily at midnight)
  enableNotifications: boolean;
  slackWebhook?: string;
  emailOnFailure?: string;
}

export class BackupScheduler {
  private config: SchedulerConfig;
  private backupService: BackupService;
  private scheduledTask: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private lastBackupResult: BackupResult | null = null;

  constructor(config: SchedulerConfig) {
    this.config = {
      enableNotifications: false,
      ...config,
    };

    this.backupService = new BackupService(config);
  }

  /**
   * Start the backup scheduler
   */
  start(): void {
    if (this.scheduledTask) {
      console.warn('[BackupScheduler] Scheduler is already running');
      return;
    }

    try {
      this.scheduledTask = cron.schedule(this.config.cronSchedule, async () => {
        await this.runBackup();
      });

      console.log(`[BackupScheduler] Backup scheduler started`);
      console.log(`[BackupScheduler] Cron schedule: ${this.config.cronSchedule}`);
      console.log(`[BackupScheduler] Next backup: ${this.scheduledTask.nextDate().toString()}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[BackupScheduler] Error starting scheduler: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Stop the backup scheduler
   */
  stop(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask.destroy();
      this.scheduledTask = null;
      console.log('[BackupScheduler] Backup scheduler stopped');
    }
  }

  /**
   * Run a backup manually
   */
  async runBackup(): Promise<BackupResult> {
    if (this.isRunning) {
      console.warn('[BackupScheduler] Backup is already running');
      return {
        success: false,
        backupFile: '',
        timestamp: new Date().toISOString(),
        size: 0,
        duration: 0,
        error: 'Backup is already running',
      };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('[BackupScheduler] Running backup...');

      const result = await this.backupService.createBackup();
      this.lastBackupResult = result;

      if (result.success) {
        console.log(`[BackupScheduler] Backup completed successfully in ${result.duration}ms`);
      } else {
        console.error(`[BackupScheduler] Backup failed: ${result.error}`);
      }

      // Send notification
      if (this.config.enableNotifications) {
        await this.sendNotification(result);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[BackupScheduler] Error running backup: ${errorMsg}`);

      const result = {
        success: false,
        backupFile: '',
        timestamp: new Date().toISOString(),
        size: 0,
        duration: Date.now() - startTime,
        error: errorMsg,
      };

      this.lastBackupResult = result;

      // Send failure notification
      if (this.config.enableNotifications) {
        await this.sendNotification(result);
      }

      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get last backup result
   */
  getLastBackupResult(): BackupResult | null {
    return this.lastBackupResult;
  }

  /**
   * Get next backup time
   */
  getNextBackupTime(): Date | null {
    if (this.scheduledTask) {
      return this.scheduledTask.nextDate().toDate();
    }
    return null;
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    running: boolean;
    isScheduled: boolean;
    cronSchedule: string;
    nextBackup: Date | null;
    lastBackup: BackupResult | null;
  } {
    return {
      running: this.isRunning,
      isScheduled: this.scheduledTask !== null,
      cronSchedule: this.config.cronSchedule,
      nextBackup: this.getNextBackupTime(),
      lastBackup: this.lastBackupResult,
    };
  }

  /**
   * Send notification about backup result
   */
  private async sendNotification(result: BackupResult): Promise<void> {
    if (result.success) {
      await this.sendSuccessNotification(result);
    } else {
      await this.sendFailureNotification(result);
    }
  }

  /**
   * Send success notification
   */
  private async sendSuccessNotification(result: BackupResult): Promise<void> {
    const message = `
✅ Database Backup Successful
File: ${result.backupFile}
Size: ${this.formatBytes(result.size)}
Duration: ${result.duration}ms
Timestamp: ${result.timestamp}
    `.trim();

    console.log(`[BackupScheduler] ${message}`);

    // Send to Slack if configured
    if (this.config.slackWebhook) {
      await this.sendSlackNotification(message, 'good');
    }
  }

  /**
   * Send failure notification
   */
  private async sendFailureNotification(result: BackupResult): Promise<void> {
    const message = `
❌ Database Backup Failed
Error: ${result.error}
Timestamp: ${result.timestamp}
    `.trim();

    console.error(`[BackupScheduler] ${message}`);

    // Send to Slack if configured
    if (this.config.slackWebhook) {
      await this.sendSlackNotification(message, 'danger');
    }

    // Send email if configured
    if (this.config.emailOnFailure) {
      await this.sendEmailNotification(result);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(message: string, color: string): Promise<void> {
    if (!this.config.slackWebhook) return;

    try {
      const payload = {
        attachments: [
          {
            color,
            text: message,
            footer: 'AI-Match Backup Service',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };

      const response = await fetch(this.config.slackWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('[BackupScheduler] Failed to send Slack notification');
      }
    } catch (error) {
      console.error('[BackupScheduler] Error sending Slack notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(result: BackupResult): Promise<void> {
    if (!this.config.emailOnFailure) return;

    try {
      // This would integrate with your email service
      console.log(`[BackupScheduler] Sending email notification to: ${this.config.emailOnFailure}`);
      // Email sending logic here
    } catch (error) {
      console.error('[BackupScheduler] Error sending email notification:', error);
    }
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Cleanup and close resources
   */
  async close(): Promise<void> {
    this.stop();
    await this.backupService.close();
    console.log('[BackupScheduler] Scheduler closed');
  }
}
