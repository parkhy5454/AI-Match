import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getBatteryOptimizationTips } from '@/lib/mobile-optimization-system';

/**
 * GET /api/mobile/battery
 * Get battery optimization tips
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const deviceId = req.nextUrl.searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId is required' },
        { status: 400 }
      );
    }

    const tips = await getBatteryOptimizationTips(userId, deviceId);

    return NextResponse.json({
      success: true,
      data: tips,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get battery tips';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
