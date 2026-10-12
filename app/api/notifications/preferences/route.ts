import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/notification-system';

/**
 * GET /api/notifications/preferences
 * Get notification preferences for current user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await getNotificationPreferences(userId);

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();

    // Validate updates
    const allowedFields = [
      'notifyLike',
      'notifyMatch',
      'notifyMessage',
      'notifyView',
      'notifyVisit',
      'emailNotifications',
      'pushNotifications',
      'emailDigest',
      'doNotDisturbStart',
      'doNotDisturbEnd',
    ];

    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowedFields.includes(key))
    );

    const preferences = await updateNotificationPreferences(userId, sanitizedUpdates);

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
