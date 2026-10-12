import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getMessageStatistics } from '@/lib/realtime-messaging-system';

/**
 * GET /api/messages/stats
 * Get message statistics
 */
export async function GET(req: NextRequest) {
  try {
    const { id: userId } = await verifyAuth(req);

    const stats = await getMessageStatistics(userId);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get statistics';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
