import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { getModerationStats, getReportStats } from '@/lib/blocking-reporting-system';

/**
 * GET /api/moderation/stats
 * Get moderation queue statistics (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    await verifyAdminAuth(req);
    const daysBack = parseInt(req.nextUrl.searchParams.get('daysBack') || '30');

    const [moderationStats, reportStats] = await Promise.all([
      getModerationStats(),
      getReportStats(daysBack),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        moderation: moderationStats,
        reports: reportStats,
        period: {
          daysBack,
          startDate: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000),
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get moderation stats';
    const status = message.includes('unauthorized') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
