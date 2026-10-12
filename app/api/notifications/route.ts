import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { getUserNotifications, getUnreadNotificationCount, markAllNotificationsAsRead } from '@/lib/notification-system';

/**
 * GET /api/notifications
 * Get all notifications for current user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

    // Get unread count if requested
    if (url.searchParams.get('count') === 'true') {
      const count = await getUnreadNotificationCount(userId);
      return NextResponse.json({ unreadCount: count });
    }

    const notifications = await getUserNotifications(userId, limit, offset, unreadOnly);
    const unreadCount = await getUnreadNotificationCount(userId);

    return NextResponse.json({
      notifications,
      unreadCount,
      count: notifications.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications
 * Mark all notifications as read
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'mark-all-read') {
      await markAllNotificationsAsRead(userId);
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
