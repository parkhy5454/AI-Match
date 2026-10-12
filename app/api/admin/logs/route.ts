import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { getAdminLogs } from '@/lib/admin-system';

/**
 * GET /api/admin/logs
 * Get admin action logs (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    await verifyAdminAuth(req);
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');
    const adminId = req.nextUrl.searchParams.get('adminId') || undefined;
    const action = req.nextUrl.searchParams.get('action') || undefined;
    const targetUserId = req.nextUrl.searchParams.get('targetUserId') || undefined;

    const logs = await getAdminLogs(limit, offset, {
      adminId: adminId || undefined,
      action: action || undefined,
      targetUserId: targetUserId || undefined,
    });

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: { limit, offset },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get logs';
    const status = message.includes('unauthorized') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
