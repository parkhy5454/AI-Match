import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import {
  getRevenueAnalytics,
  getComplianceReport,
  getAdminLogs,
} from '@/lib/admin-system';

/**
 * GET /api/admin/analytics
 * Get analytics and compliance data (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    await verifyAdminAuth(req);
    const daysBack = parseInt(req.nextUrl.searchParams.get('daysBack') || '30');

    const [revenue, compliance, logs] = await Promise.all([
      getRevenueAnalytics(daysBack),
      getComplianceReport(daysBack),
      getAdminLogs(50, 0),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        revenue,
        compliance,
        recentLogs: logs,
        period: {
          daysBack,
          startDate: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000),
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get analytics';
    const status = message.includes('unauthorized') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
