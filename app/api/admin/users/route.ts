import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { getAllUsers, getUserDetails, searchUsers } from '@/lib/admin-system';
import { logAdminAction } from '@/lib/admin-system';

/**
 * GET /api/admin/users
 * Get all users with filtering (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    await verifyAdminAuth(req);
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');
    const search = req.nextUrl.searchParams.get('search') || undefined;
    const status = (req.nextUrl.searchParams.get('status') as any) || undefined;
    const verified = req.nextUrl.searchParams.get('verified');

    const filter = {
      search: search || undefined,
      status: status || undefined,
      verified: verified ? verified === 'true' : undefined,
    };

    const users = await getAllUsers(limit, offset, filter);

    return NextResponse.json({
      success: true,
      data: users,
      pagination: { limit, offset },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get users';
    const status = message.includes('unauthorized') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
