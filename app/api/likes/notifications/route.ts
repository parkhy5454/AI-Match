import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getMatchNotifications,
  markNotificationAsRead,
} from '@/lib/like-match-system';

/**
 * GET /api/likes/notifications
 * Get match notifications
 */
export async function GET(req: NextRequest) {
  try {
    const { id: userId } = await verifyAuth(req);
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');

    const notifications = await getMatchNotifications(userId, limit);

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get notifications';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

/**
 * POST /api/likes/notifications
 * Mark notification as read
 */
export async function POST(req: NextRequest) {
  try {
    const { id: userId } = await verifyAuth(req);
    const { notificationId } = await req.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId is required' },
        { status: 400 }
      );
    }

    const notification = await markNotificationAsRead(notificationId, userId);

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark notification';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
