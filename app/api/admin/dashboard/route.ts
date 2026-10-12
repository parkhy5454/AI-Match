import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import {
  getDashboardStats,
  getEngagementMetrics,
  getMostActiveUsers,
  getSystemHealth,
} from '@/lib/admin-system';

/**
 * GET /api/admin/dashboard
 * Get comprehensive dashboard data (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    await verifyAdminAuth(req);

    const [stats, engagement, activeUsers, health] = await Promise.all([
      getDashboardStats(),
      getEngagementMetrics(),
      getMostActiveUsers(10, 30),
      getSystemHealth(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        engagement,
        activeUsers,
        health,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get dashboard data';
    const status = message.includes('unauthorized') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
