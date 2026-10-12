import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { blockUser, unblockUser, getBlockedUsers } from '@/lib/blocking-reporting-system';

/**
 * POST /api/blocking
 * Block a user
 */
export async function POST(req: NextRequest) {
  try {
    const { id: userId } = await verifyAuth(req);
    const { blockedId, reason } = await req.json();

    if (!blockedId) {
      return NextResponse.json(
        { error: 'blockedId is required' },
        { status: 400 }
      );
    }

    const block = await blockUser(userId, blockedId, reason);

    return NextResponse.json({
      success: true,
      data: block,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to block user';
    const status = message.includes('Cannot block yourself') || message.includes('already blocked')
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * GET /api/blocking
 * Get blocked users list
 */
export async function GET(req: NextRequest) {
  try {
    const { id: userId } = await verifyAuth(req);
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    const blockedUsers = await getBlockedUsers(userId, limit, offset);

    return NextResponse.json({
      success: true,
      data: blockedUsers,
      pagination: { limit, offset },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get blocked users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/blocking
 * Unblock a user
 */
export async function DELETE(req: NextRequest) {
  try {
    const { id: userId } = await verifyAuth(req);
    const { blockedId } = await req.json();

    if (!blockedId) {
      return NextResponse.json(
        { error: 'blockedId is required' },
        { status: 400 }
      );
    }

    const block = await unblockUser(userId, blockedId);

    return NextResponse.json({
      success: true,
      data: block,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unblock user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
