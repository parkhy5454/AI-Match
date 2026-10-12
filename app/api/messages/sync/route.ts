import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { syncMessages } from '@/lib/realtime-messaging-system';

/**
 * POST /api/messages/sync
 * Sync messages and related data
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const { lastSyncTimestamp } = await req.json();

    if (!lastSyncTimestamp) {
      return NextResponse.json(
        { error: 'lastSyncTimestamp is required' },
        { status: 400 }
      );
    }

    const syncData = await syncMessages(userId, new Date(lastSyncTimestamp));

    return NextResponse.json({
      success: true,
      data: syncData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync messages';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
