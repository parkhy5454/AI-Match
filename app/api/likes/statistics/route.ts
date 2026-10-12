import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getLikeStatistics,
  getDailyLikeInfo,
  getUserLikeHistory,
} from '@/lib/like-match-system';

/**
 * GET /api/likes/statistics
 * Get like statistics and daily limits
 */
export async function GET(req: NextRequest) {
  try {
    const { id: userId } = await verifyAuth(req);
    const type = req.nextUrl.searchParams.get('type') || 'general';

    let result;
    if (type === 'daily') {
      result = await getDailyLikeInfo(userId);
    } else if (type === 'history') {
      result = await getUserLikeHistory(userId);
    } else {
      result = await getLikeStatistics(userId);
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get statistics';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
