import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getLikesReceived,
  getLikesSent,
  checkIfUserLiked,
} from '@/lib/like-match-system';

/**
 * GET /api/likes
 * Get likes received or sent by user
 */
export async function GET(req: NextRequest) {
  try {
    const { id: userId } = await verifyAuth(req);
    const type = req.nextUrl.searchParams.get('type') || 'received';
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    let likes;
    if (type === 'sent') {
      likes = await getLikesSent(userId, limit, offset);
    } else {
      likes = await getLikesReceived(userId, limit, offset);
    }

    return NextResponse.json({
      success: true,
      data: likes,
      pagination: { limit, offset },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get likes';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
