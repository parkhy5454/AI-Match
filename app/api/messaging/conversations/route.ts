import { NextRequest, NextResponse } from 'next/server';
import { getUserId, verifyToken } from '@/lib/auth';
import { createOrGetConversation, getUserConversations } from '@/lib/messaging-system';

/**
 * POST /api/messaging/conversations
 * Create or get existing conversation between two users
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { otherUserId } = await request.json();

    if (!otherUserId) {
      return NextResponse.json({ error: 'otherUserId is required' }, { status: 400 });
    }

    if (userId === otherUserId) {
      return NextResponse.json(
        { error: 'Cannot create conversation with yourself' },
        { status: 400 }
      );
    }

    const conversation = await createOrGetConversation(userId, otherUserId);

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/messaging/conversations
 * Get all conversations for current user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const conversations = await getUserConversations(userId, limit, offset);

    return NextResponse.json({
      conversations,
      count: conversations.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
