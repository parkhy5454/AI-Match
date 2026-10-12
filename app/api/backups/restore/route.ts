/**
 * Backup Restore API Endpoint
 * POST /api/backups/restore - Restore database from a backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBackupScheduler } from '@/lib/backup/initializeBackupScheduler';

interface RestoreRequest {
  backupFile: string;
  isS3: boolean;
}

/**
 * POST /api/backups/restore
 * Restore database from a backup file
 *
 * Request body:
 * {
 *   "backupFile": "backup-2026-10-11T12-30-00-000Z.sql.gz",
 *   "isS3": false
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: RestoreRequest = await request.json();
    const { backupFile, isS3 } = body;

    // Validate input
    if (!backupFile) {
      return NextResponse.json(
        {
          error: 'Missing required field: backupFile',
        },
        { status: 400 }
      );
    }

    // Get scheduler
    const scheduler = getBackupScheduler();
    if (!scheduler) {
      return NextResponse.json(
        {
          error: 'Backup scheduler not initialized',
        },
        { status: 503 }
      );
    }

    // Confirm restoration (dangerous operation)
    const confirmHeader = request.headers.get('X-Confirm-Restore');
    if (confirmHeader !== 'true') {
      return NextResponse.json(
        {
          error: 'Restore operation requires confirmation',
          message: 'Send header "X-Confirm-Restore: true" to confirm this operation',
          warning: 'This will overwrite your current database with the backup data',
        },
        { status: 400 }
      );
    }

    // Log restore attempt
    console.warn(`[Backups API] Starting restore operation from: ${backupFile}`);

    // Restore the backup
    const backupService = scheduler['backupService'];
    await backupService.restoreBackup(backupFile, isS3);

    console.log(`[Backups API] Database restored successfully from: ${backupFile}`);

    return NextResponse.json({
      success: true,
      message: 'Database restored successfully',
      backupFile,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Backups API] Error restoring backup:', errorMsg);

    return NextResponse.json(
      {
        error: 'Failed to restore backup',
        message: errorMsg,
      },
      { status: 500 }
    );
  }
}
