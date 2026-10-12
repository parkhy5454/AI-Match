import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  recordReadReceipt,
  markConversationAsRead,
} from '@/lib/realtime-messaging-system';

/**
 * POST /api/messages/read
 * Mark message or conversation as read
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const { messageId, senderId } = await req.json();

    if (!messageId && !senderId) {
      return NextResponse.json(
        { error: 'Either messageId or senderId is required' },
        { status: 400 }
      );
    }

    let result;
    if (messageId) {
      result = await recordReadReceipt(messageId, userId);
    } else {
      result = await markConversationAsRead(userId, senderId);
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record read receipt';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
