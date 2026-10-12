import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { checkIfUserLiked } from '@/lib/like-match-system';

/**
 * GET /api/likes/check
 * Check if current user liked another user
 */
export async function GET(req: NextRequest) {
  try {
    const { id: userId } = await verifyAuth(req);
    const toUserId = req.nextUrl.searchParams.get('toUserId');

    if (!toUserId) {
      return NextResponse.json(
        { error: 'toUserId is required' },
        { status: 400 }
      );
    }

    const likeType = await checkIfUserLiked(userId, toUserId);

    return NextResponse.json({
      success: true,
      data: {
        liked: likeType !== null,
        likeType: likeType,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check like';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
