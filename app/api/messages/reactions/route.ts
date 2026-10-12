import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  addMessageReaction,
  removeMessageReaction,
  getMessageReactions,
} from '@/lib/realtime-messaging-system';

/**
 * POST /api/messages/reactions
 * Add reaction to message
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const { messageId, reaction } = await req.json();

    if (!messageId || !reaction) {
      return NextResponse.json(
        { error: 'messageId and reaction are required' },
        { status: 400 }
      );
    }

    const result = await addMessageReaction(messageId, userId, reaction);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add reaction';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

/**
 * DELETE /api/messages/reactions
 * Remove reaction from message
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const { messageId, reaction } = await req.json();

    if (!messageId || !reaction) {
      return NextResponse.json(
        { error: 'messageId and reaction are required' },
        { status: 400 }
      );
    }

    await removeMessageReaction(messageId, userId, reaction);

    return NextResponse.json({
      success: true,
      message: 'Reaction removed',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove reaction';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

/**
 * GET /api/messages/reactions
 * Get reactions for message
 */
export async function GET(req: NextRequest) {
  try {
    await verifyAuth(req);
    const messageId = req.nextUrl.searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId is required' },
        { status: 400 }
      );
    }

    const reactions = await getMessageReactions(messageId);

    return NextResponse.json({
      success: true,
      data: reactions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get reactions';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
