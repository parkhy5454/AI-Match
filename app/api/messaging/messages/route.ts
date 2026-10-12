import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import {
  sendMessage,
  getMessageHistory,
  markConversationAsRead,
  searchMessages,
  getUnreadMessageCount,
} from '@/lib/messaging-system';

/**
 * POST /api/messaging/messages
 * Send a message
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, content, imageUrl } = await request.json();

    if (!conversationId || !content) {
      return NextResponse.json(
        { error: 'conversationId and content are required' },
        { status: 400 }
      );
    }

    const message = await sendMessage(conversationId, userId, content, imageUrl);

    return NextResponse.json(message, { status: 201 });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/messaging/messages
 * Get message history for a conversation or unread count
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversationId');
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const searchTerm = url.searchParams.get('search');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get unread count
    if (unreadOnly) {
      const count = await getUnreadMessageCount(userId);
      return NextResponse.json({ unreadCount: count });
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    // Search messages if search term provided
    if (searchTerm) {
      const messages = await searchMessages(
        conversationId,
        userId,
        searchTerm,
        limit,
        offset
      );
      return NextResponse.json({
        messages,
        count: messages.length,
        searchTerm,
      });
    }

    // Get message history
    const messages = await getMessageHistory(conversationId, userId, limit, offset);

    return NextResponse.json({
      messages,
      count: messages.length,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
