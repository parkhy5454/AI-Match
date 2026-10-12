/**
 * Database Backup Service
 * Handles database backups, storage, validation, and restoration
 */

import { execSync } from 'child_process';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

export interface BackupConfig {
  databaseUrl: string;
  s3Bucket: string;
  s3Region: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  backupDir?: string;
  maxBackups?: number;
  compressionEnabled?: boolean;
}

export interface BackupResult {
  success: boolean;
  backupFile: string;
  timestamp: string;
  size: number;
  duration: number;
  error?: string;
}

export interface BackupInfo {
  name: string;
  timestamp: string;
  size: number;
  location: 'local' | 's3';
  verified: boolean;
}

export class BackupService {
  private config: BackupConfig;
  private s3Client: S3Client;

  constructor(config: BackupConfig) {
    this.config = {
      backupDir: '/tmp/backups',
      maxBackups: 7,
      compressionEnabled: true,
      ...config,
    };

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: this.config.s3Region,
      credentials: {
        accessKeyId: this.config.awsAccessKeyId,
        secretAccessKey: this.config.awsSecretAccessKey,
      },
    });

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(this.config.backupDir!)) {
      fs.mkdirSync(this.config.backupDir!, { recursive: true });
    }
  }

  /**
   * Create a database backup
   */
  async createBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.sql${this.config.compressionEnabled ? '.gz' : ''}`;
    const backupFilePath = path.join(this.config.backupDir!, backupFileName);

    try {
      console.log(`[Backup] Starting database backup: ${backupFileName}`);

      // Extract database credentials from URL
      const dbUrl = new URL(this.config.databaseUrl);
      const username = dbUrl.username;
      const password = dbUrl.password;
      const host = dbUrl.hostname;
      const database = dbUrl.pathname.replace('/', '');

      // Create pg_dump command
      let dumpCommand = `pg_dump -h ${host} -U ${username} -d ${database} --no-password`;

      // Set password via environment
      const env = {
        ...process.env,
        PGPASSWORD: password,
      };

      // Add compression if enabled
      if (this.config.compressionEnabled) {
        dumpCommand += ` | gzip > ${backupFilePath}`;
      } else {
        dumpCommand += ` > ${backupFilePath}`;
      }

      // Execute backup
      execSync(dumpCommand, { env, stdio: 'pipe' });

      // Check if backup file was created
      if (!fs.existsSync(backupFilePath)) {
        throw new Error('Backup file was not created');
      }

      // Get file size
      const stats = fs.statSync(backupFilePath);
      const backupSize = stats.size;
      const duration = Date.now() - startTime;

      console.log(`[Backup] Backup created successfully: ${backupFileName} (${this.formatBytes(backupSize)})`);

      // Upload to S3
      await this.uploadToS3(backupFilePath, backupFileName);

      // Verify backup
      const verified = await this.verifyBackup(backupFilePath);

      // Clean up old backups
      await this.cleanupOldBackups();

      return {
        success: true,
        backupFile: backupFileName,
        timestamp,
        size: backupSize,
        duration,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Backup] Error creating backup: ${errorMsg}`);

      // Clean up partial backup file
      if (fs.existsSync(backupFilePath)) {
        fs.unlinkSync(backupFilePath);
      }

      return {
        success: false,
        backupFile: backupFileName,
        timestamp,
        size: 0,
        duration: Date.now() - startTime,
        error: errorMsg,
      };
    }
  }

  /**
   * Upload backup to S3
   */
  private async uploadToS3(filePath: string, fileName: string): Promise<void> {
    try {
      const fileContent = fs.readFileSync(filePath);

      const command = new PutObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: `backups/${fileName}`,
        Body: fileContent,
        ContentType: this.config.compressionEnabled ? 'application/gzip' : 'application/sql',
        Metadata: {
          'backup-date': new Date().toISOString(),
          'backup-size': fileContent.length.toString(),
        },
      });

      await this.s3Client.send(command);
      console.log(`[Backup] Backup uploaded to S3: s3://${this.config.s3Bucket}/backups/${fileName}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Backup] Error uploading to S3: ${errorMsg}`);
      // Don't throw - local backup is still valid
    }
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackup(filePath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(filePath)) {
        return false;
      }

      const stats = fs.statSync(filePath);
      // Basic verification: file exists and has content
      const verified = stats.size > 0;

      if (verified) {
        console.log(`[Backup] Backup verified successfully`);
      }

      return verified;
    } catch (error) {
      console.error(`[Backup] Error verifying backup:`, error);
      return false;
    }
  }

  /**
   * List all backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    const backups: BackupInfo[] = [];

    try {
      // List local backups
      const localBackups = fs.readdirSync(this.config.backupDir!);
      for (const file of localBackups) {
        if (file.startsWith('backup-')) {
          const filePath = path.join(this.config.backupDir!, file);
          const stats = fs.statSync(filePath);

          backups.push({
            name: file,
            timestamp: stats.birthtimeMs.toString(),
            size: stats.size,
            location: 'local',
            verified: stats.size > 0,
          });
        }
      }

      // List S3 backups
      try {
        const command = new ListObjectsV2Command({
          Bucket: this.config.s3Bucket,
          Prefix: 'backups/',
        });

        const response = await this.s3Client.send(command);
        if (response.Contents) {
          for (const object of response.Contents) {
            if (object.Key && object.Size !== undefined) {
              backups.push({
                name: path.basename(object.Key),
                timestamp: object.LastModified?.getTime().toString() || '',
                size: object.Size,
                location: 's3',
                verified: true,
              });
            }
          }
        }
      } catch (error) {
        console.warn('[Backup] Could not list S3 backups');
      }

      return backups.sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));
    } catch (error) {
      console.error('[Backup] Error listing backups:', error);
      return [];
    }
  }

  /**
   * Download backup from S3
   */
  async downloadBackupFromS3(fileName: string, outputPath: string): Promise<void> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: `backups/${fileName}`,
      });

      const response = await this.s3Client.send(command);
      const chunks: Buffer[] = [];

      if (response.Body instanceof ReadableStream) {
        const reader = response.Body.getReader();
        let result = await reader.read();

        while (!result.done) {
          chunks.push(Buffer.from(result.value));
          result = await reader.read();
        }
      }

      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(outputPath, buffer);
      console.log(`[Backup] Downloaded from S3: ${fileName}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to download backup from S3: ${errorMsg}`);
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupFile: string, isS3: boolean = false): Promise<void> {
    try {
      let backupPath = backupFile;

      // Download from S3 if needed
      if (isS3) {
        const tempPath = path.join(this.config.backupDir!, `restore-${Date.now()}.sql`);
        await this.downloadBackupFromS3(backupFile, tempPath);
        backupPath = tempPath;
      }

      console.log(`[Backup] Starting database restore from: ${backupFile}`);

      // Extract database credentials from URL
      const dbUrl = new URL(this.config.databaseUrl);
      const username = dbUrl.username;
      const password = dbUrl.password;
      const host = dbUrl.hostname;
      const database = dbUrl.pathname.replace('/', '');

      // Create restore command
      let restoreCommand = '';
      const env = {
        ...process.env,
        PGPASSWORD: password,
      };

      if (backupFile.endsWith('.gz')) {
        restoreCommand = `gunzip -c ${backupPath} | psql -h ${host} -U ${username} -d ${database} --no-password`;
      } else {
        restoreCommand = `psql -h ${host} -U ${username} -d ${database} --no-password < ${backupPath}`;
      }

      // Execute restore
      execSync(restoreCommand, { env, stdio: 'pipe' });

      console.log(`[Backup] Database restored successfully from: ${backupFile}`);

      // Clean up temp file
      if (isS3 && fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to restore backup: ${errorMsg}`);
    }
  }

  /**
   * Clean up old backups
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const maxBackups = this.config.maxBackups || 7;
      const backups = await this.listBackups();

      if (backups.length > maxBackups) {
        const toDelete = backups.slice(maxBackups);

        for (const backup of toDelete) {
          if (backup.location === 'local') {
            const filePath = path.join(this.config.backupDir!, backup.name);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`[Backup] Deleted old backup: ${backup.name}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('[Backup] Error cleaning up old backups:', error);
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
   * Close S3 client
   */
  async close(): Promise<void> {
    this.s3Client.destroy();
  }
}
