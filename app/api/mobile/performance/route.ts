import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  recordPerformanceMetrics,
  getPerformanceAnalytics,
} from '@/lib/mobile-optimization-system';

/**
 * POST /api/mobile/performance
 * Record performance metrics from device
 */
export async function POST(req: NextRequest) {
  try {
    const { id: userId } = await verifyAuth(req);
    const { deviceId, ...metrics } = await req.json();

    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId is required' },
        { status: 400 }
      );
    }

    const recorded = await recordPerformanceMetrics(userId, deviceId, metrics);

    return NextResponse.json({
      success: true,
      data: recorded,
      message: 'Performance metrics recorded',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record metrics';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

/**
 * GET /api/mobile/performance
 * Get performance analytics
 */
export async function GET(req: NextRequest) {
  try {
    const { id: userId } = await verifyAuth(req);
    const deviceId = req.nextUrl.searchParams.get('deviceId');
    const daysBack = parseInt(req.nextUrl.searchParams.get('daysBack') || '7');

    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId is required' },
        { status: 400 }
      );
    }

    const analytics = await getPerformanceAnalytics(userId, deviceId, daysBack);

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
