import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getUnreadMessageCount,
  getUnreadMessages,
} from '@/lib/realtime-messaging-system';

/**
 * GET /api/messages/unread
 * Get unread messages count and messages
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const countOnly = req.nextUrl.searchParams.get('countOnly') === 'true';

    if (countOnly) {
      const count = await getUnreadMessageCount(userId);
      return NextResponse.json({
        success: true,
        data: { unreadCount: count },
      });
    }

    const [count, messages] = await Promise.all([
      getUnreadMessageCount(userId),
      getUnreadMessages(userId, limit),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        unreadCount: count,
        messages,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get unread messages';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
