import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getAppHealthScore,
  getNetworkQualityMetrics,
  getDataUsageBreakdown,
} from '@/lib/mobile-optimization-system';

/**
 * GET /api/mobile/health
 * Get app health score and diagnostics
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

    const [health, network, dataUsage] = await Promise.all([
      getAppHealthScore(userId, deviceId),
      getNetworkQualityMetrics(deviceId),
      getDataUsageBreakdown(userId, deviceId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        health,
        network,
        dataUsage,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get health info';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
