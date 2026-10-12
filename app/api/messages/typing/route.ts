import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { setTypingIndicator } from '@/lib/realtime-messaging-system';

/**
 * POST /api/messages/typing
 * Send typing indicator
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const { recipientId, isTyping } = await req.json();

    if (!recipientId) {
      return NextResponse.json(
        { error: 'recipientId is required' },
        { status: 400 }
      );
    }

    const indicator = await setTypingIndicator(userId, recipientId, isTyping);

    return NextResponse.json({
      success: true,
      data: indicator,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to set typing indicator';
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
