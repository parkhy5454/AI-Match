import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getConversationList,
  muteConversation,
  pinConversation,
  archiveConversation,
} from '@/lib/realtime-messaging-system';

/**
 * GET /api/messages/conversations
 * Get conversation list
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    const result = await getConversationList(userId, limit, offset);

    return NextResponse.json({
      success: true,
      data: result.conversations,
      pagination: { limit, offset, total: result.total },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get conversations';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

/**
 * POST /api/messages/conversations
 * Update conversation settings
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const { partnerId, action, muteDurationMinutes } = await req.json();

    if (!partnerId || !action) {
      return NextResponse.json(
        { error: 'partnerId and action are required' },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case 'mute':
        result = await muteConversation(userId, partnerId, muteDurationMinutes || 60);
        break;
      case 'pin':
        result = await pinConversation(userId, partnerId, true);
        break;
      case 'unpin':
        result = await pinConversation(userId, partnerId, false);
        break;
      case 'archive':
        result = await archiveConversation(userId, partnerId);
        break;
      default:
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
    const message = error instanceof Error ? error.message : 'Failed to update conversation';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
