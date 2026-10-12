import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { sendLike, sendPass } from '@/lib/like-match-system';

/**
 * POST /api/likes/send
 * Send a like or pass to another user
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const { toUserId, action } = await req.json();

    if (!toUserId || !action) {
      return NextResponse.json(
        { error: 'toUserId and action are required' },
        { status: 400 }
      );
    }

    let result;
    if (action === 'like') {
      result = await sendLike(userId, toUserId, 'like');
    } else if (action === 'superlike') {
      result = await sendLike(userId, toUserId, 'superlike');
    } else if (action === 'pass') {
      result = await sendPass(userId, toUserId);
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
    const message = error instanceof Error ? error.message : 'Failed to send like';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
