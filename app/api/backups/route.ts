/**
 * Backups API Endpoints
 * GET    /api/backups       - List all backups
 * POST   /api/backups       - Create a new backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBackupScheduler, runManualBackup, getBackupSchedulerStatus } from '@/lib/backup/initializeBackupScheduler';

/**
 * GET /api/backups
 * List all backups and scheduler status
 */
export async function GET(request: NextRequest) {
  try {
    const scheduler = getBackupScheduler();

    if (!scheduler) {
      return NextResponse.json(
        {
          error: 'Backup scheduler not initialized',
          status: getBackupSchedulerStatus(),
        },
        { status: 503 }
      );
    }

    const backups = await scheduler['backupService'].listBackups();
    const status = scheduler.getStatus();

    return NextResponse.json({
      success: true,
      backups,
      status: {
        running: status.running,
        isScheduled: status.isScheduled,
        cronSchedule: status.cronSchedule,
        nextBackup: status.nextBackup,
        lastBackup: status.lastBackup,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Backups API] Error listing backups:', errorMsg);

    return NextResponse.json(
      {
        error: 'Failed to list backups',
        message: errorMsg,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backups
 * Create a new backup manually
 */
export async function POST(request: NextRequest) {
  try {
    const result = await runManualBackup();

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: 'Backup created successfully',
          backup: result,
        },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Backup creation failed',
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Backups API] Error creating backup:', errorMsg);

    return NextResponse.json(
      {
        error: 'Failed to create backup',
        message: errorMsg,
      },
      { status: 500 }
    );
  }
}
