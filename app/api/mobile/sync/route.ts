import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  storeOfflineData,
  syncOfflineData,
  getUnsyncedData,
} from '@/lib/mobile-optimization-system';

/**
 * POST /api/mobile/sync
 * Sync offline data to server
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const { deviceId } = await req.json();

    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId is required' },
        { status: 400 }
      );
    }

    const result = await syncOfflineData(userId, deviceId);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Synced ${result.synced} items`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync data';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

/**
 * GET /api/mobile/sync
 * Get unsynced offline data
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const unsynced = await getUnsyncedData(userId);

    return NextResponse.json({
      success: true,
      data: unsynced,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get unsynced data';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
