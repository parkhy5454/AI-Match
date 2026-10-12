import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { updatePushPreferences } from '@/lib/mobile-optimization-system';

/**
 * POST /api/mobile/push
 * Update push notification preferences
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const preferences = await req.json();

    const updated = await updatePushPreferences(userId, preferences);

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Push preferences updated',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update preferences';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
