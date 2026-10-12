import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  recordAnalyticsEvent,
  getSessionAnalytics,
  getAppHealthScore,
} from '@/lib/mobile-optimization-system';

/**
 * POST /api/mobile/analytics
 * Record analytics event
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const { deviceId, eventName, sessionId, properties } = await req.json();

    if (!deviceId || !eventName || !sessionId) {
      return NextResponse.json(
        { error: 'deviceId, eventName, and sessionId are required' },
        { status: 400 }
      );
    }

    const event = await recordAnalyticsEvent(
      userId,
      deviceId,
      eventName,
      sessionId,
      properties
    );

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record event';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

/**
 * GET /api/mobile/analytics
 * Get session analytics
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const daysBack = parseInt(req.nextUrl.searchParams.get('daysBack') || '7');

    const analytics = await getSessionAnalytics(userId, daysBack);

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get analytics';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
