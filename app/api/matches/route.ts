import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getUserMatches,
  unmatch,
} from '@/lib/like-match-system';

/**
 * GET /api/matches
 * Get user matches
 */
export async function GET(req: NextRequest) {
  try {
    const { id: userId } = await verifyAuth(req);
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    const matches = await getUserMatches(userId, limit, offset);

    return NextResponse.json({
      success: true,
      data: matches,
      pagination: { limit, offset },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get matches';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

/**
 * DELETE /api/matches
 * Unmatch with a user
 */
export async function DELETE(req: NextRequest) {
  try {
    const { id: userId } = await verifyAuth(req);
    const { matchId } = await req.json();

    if (!matchId) {
      return NextResponse.json(
        { error: 'matchId is required' },
        { status: 400 }
      );
    }

    const result = await unmatch(matchId, userId);

    return NextResponse.json({
      success: result,
      message: 'Unmatched successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unmatch';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
