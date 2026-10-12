import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  blockUser,
  unblockUser,
  reportUser,
} from '@/lib/like-match-system';

/**
 * POST /api/likes/moderation
 * Block, unblock, or report a user
 */
export async function POST(req: NextRequest) {
  try {
    const { id: userId } = await verifyAuth(req);
    const { action, targetUserId, reason, details } = await req.json();

    if (!action || !targetUserId) {
      return NextResponse.json(
        { error: 'action and targetUserId are required' },
        { status: 400 }
      );
    }

    let result;
    if (action === 'block') {
      result = await blockUser(userId, targetUserId);
    } else if (action === 'unblock') {
      result = await unblockUser(userId, targetUserId);
    } else if (action === 'report') {
      if (!reason) {
        return NextResponse.json(
          { error: 'reason is required for report' },
          { status: 400 }
        );
      }
      result = await reportUser(userId, targetUserId, reason, details);
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to execute action';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
