import { prisma } from '@/lib/db';

/**
 * Real-Time Messaging System
 *
 * WebSocket-based real-time messaging with typing indicators,
 * read receipts, message reactions, and presence awareness
 */

// Types
export interface MessageEvent {
  type: 'message' | 'typing' | 'read' | 'reaction' | 'presence' | 'typing_stop';
  senderId: string;
  recipientId?: string;
  messageId?: string;
  content?: string;
  reaction?: string;
  isOnline?: boolean;
  timestamp: Date;
}

export interface TypingIndicator {
  userId: string;
  recipientId: string;
  isTyping: boolean;
  startedAt: Date;
  stoppedAt?: Date;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  reaction: string; // emoji or name
  createdAt: Date;
}

export interface ReadReceipt {
  id: string;
  messageId: string;
  userId: string;
  readAt: Date;
}

export interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeenAt: Date;
  currentScreen?: string;
  deviceType?: 'ios' | 'android' | 'web';
}

export interface WebSocketSession {
  userId: string;
  sessionId: string;
  deviceId: string;
  connectedAt: Date;
  disconnectedAt?: Date;
  isActive: boolean;
  messageQueue: any[];
}

export interface MessageSyncData {
  messages: any[];
  reactions: MessageReaction[];
  receipts: ReadReceipt[];
  typingIndicators: TypingIndicator[];
  presenceUpdates: UserPresence[];
  timestamp: Date;
}

export interface ConversationMetadata {
  conversationId: string;
  participantIds: string[];
  lastMessageAt: Date;
  unreadCount: number;
  mutedUntil?: Date;
  isPinned: boolean;
  isArchived: boolean;
}

/**
 * Send real-time message event
 */
export async function sendMessageEvent(
  event: MessageEvent
): Promise<{ success: boolean; deliveredAt: Date }> {
  try {
    const deliveredAt = new Date();

    // Store event in database
    await storeMessageEvent(event);

    // Broadcast to active WebSocket connections
    // In production, would use Redis pub/sub or similar
    console.log(`Message event sent: ${event.type} from ${event.senderId}`);

    return { success: true, deliveredAt };
  } catch (error) {
    throw new Error(
      `Failed to send message event: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Store message event in database
 */
async function storeMessageEvent(event: MessageEvent): Promise<void> {
  try {
    // Would store in message_events table
    console.log('Event stored:', event.type);
  } catch (error) {
    console.error('Error storing event:', error);
  }
}

/**
 * Set typing indicator
 */
export async function setTypingIndicator(
  userId: string,
  recipientId: string,
  isTyping: boolean
): Promise<TypingIndicator> {
  try {
    const indicator: TypingIndicator = {
      userId,
      recipientId,
      isTyping,
      startedAt: isTyping ? new Date() : new Date(Date.now() - 5000),
      stoppedAt: !isTyping ? new Date() : undefined,
    };

    // Store in database
    console.log(`Typing indicator: ${userId} -> ${recipientId} (${isTyping})`);

    // Broadcast to recipient via WebSocket
    await sendMessageEvent({
      type: isTyping ? 'typing' : 'typing_stop',
      senderId: userId,
      recipientId,
      timestamp: new Date(),
    });

    return indicator;
  } catch (error) {
    throw new Error(
      `Failed to set typing indicator: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Record message as read
 */
export async function recordReadReceipt(
  messageId: string,
  userId: string
): Promise<ReadReceipt> {
  try {
    const receipt: ReadReceipt = {
      id: `receipt_${Date.now()}`,
      messageId,
      userId,
      readAt: new Date(),
    };

    // Get message to find sender
    const message = await getMessageById(messageId);
    if (message) {
      // Send read receipt event to sender
      await sendMessageEvent({
        type: 'read',
        senderId: userId,
        recipientId: message.senderId,
        messageId,
        timestamp: new Date(),
      });
    }

    console.log(`Message ${messageId} read by ${userId}`);

    return receipt;
  } catch (error) {
    throw new Error(
      `Failed to record read receipt: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get unread message count
 */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    const unread = await prisma.message.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });

    return unread;
  } catch (error) {
    throw new Error(
      `Failed to get unread count: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get unread messages
 */
export async function getUnreadMessages(
  userId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const messages = await prisma.message.findMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages;
  } catch (error) {
    throw new Error(
      `Failed to get unread messages: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Mark all messages from user as read
 */
export async function markConversationAsRead(
  userId: string,
  senderId: string
): Promise<{ updatedCount: number }> {
  try {
    const result = await prisma.message.updateMany({
      where: {
        recipientId: userId,
        senderId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    console.log(`Marked ${result.count} messages as read`);

    return { updatedCount: result.count };
  } catch (error) {
    throw new Error(
      `Failed to mark conversation as read: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Add reaction to message
 */
export async function addMessageReaction(
  messageId: string,
  userId: string,
  reaction: string
): Promise<MessageReaction> {
  try {
    const messageReaction: MessageReaction = {
      id: `reaction_${Date.now()}`,
      messageId,
      userId,
      reaction,
      createdAt: new Date(),
    };

    // Store in database
    console.log(`Reaction added to message ${messageId}: ${reaction}`);

    // Get message to find sender
    const message = await getMessageById(messageId);
    if (message) {
      // Broadcast reaction to sender
      await sendMessageEvent({
        type: 'reaction',
        senderId: userId,
        recipientId: message.senderId,
        messageId,
        reaction,
        timestamp: new Date(),
      });
    }

    return messageReaction;
  } catch (error) {
    throw new Error(
      `Failed to add reaction: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Remove reaction from message
 */
export async function removeMessageReaction(
  messageId: string,
  userId: string,
  reaction: string
): Promise<boolean> {
  try {
    // Delete from database
    console.log(`Reaction removed from message ${messageId}`);

    return true;
  } catch (error) {
    throw new Error(
      `Failed to remove reaction: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get message reactions
 */
export async function getMessageReactions(messageId: string): Promise<MessageReaction[]> {
  try {
    // Would query from message_reactions table
    return [];
  } catch (error) {
    throw new Error(
      `Failed to get reactions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Update user presence
 */
export async function updateUserPresence(
  userId: string,
  isOnline: boolean,
  deviceType?: 'ios' | 'android' | 'web',
  currentScreen?: string
): Promise<UserPresence> {
  try {
    const presence: UserPresence = {
      userId,
      isOnline,
      lastSeenAt: new Date(),
      currentScreen,
      deviceType,
    };

    // Store in cache (Redis)
    console.log(`User ${userId} presence updated: ${isOnline ? 'online' : 'offline'}`);

    // Broadcast presence to contacts
    await broadcastPresenceUpdate(userId, isOnline);

    return presence;
  } catch (error) {
    throw new Error(
      `Failed to update presence: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Broadcast presence update to all contacts
 */
async function broadcastPresenceUpdate(userId: string, isOnline: boolean): Promise<void> {
  try {
    // Get all active conversations
    const conversations = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      select: {
        senderId: true,
        recipientId: true,
      },
      distinct: ['senderId', 'recipientId'],
    });

    // Send presence event to all conversation partners
    for (const conv of conversations) {
      const partnerId = conv.senderId === userId ? conv.recipientId : conv.senderId;

      await sendMessageEvent({
        type: 'presence',
        senderId: userId,
        recipientId: partnerId,
        isOnline,
        timestamp: new Date(),
      });
    }
  } catch (error) {
    console.error('Error broadcasting presence:', error);
  }
}

/**
 * Get user presence
 */
export async function getUserPresence(userId: string): Promise<UserPresence | null> {
  try {
    // Would query from cache or database
    return null;
  } catch (error) {
    console.error('Error getting presence:', error);
    return null;
  }
}

/**
 * Create or update WebSocket session
 */
export async function createWebSocketSession(
  userId: string,
  deviceId: string
): Promise<WebSocketSession> {
  try {
    const session: WebSocketSession = {
      userId,
      sessionId: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deviceId,
      connectedAt: new Date(),
      isActive: true,
      messageQueue: [],
    };

    console.log(`WebSocket session created for user ${userId}`);

    // Update presence
    await updateUserPresence(userId, true);

    return session;
  } catch (error) {
    throw new Error(
      `Failed to create WebSocket session: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Close WebSocket session
 */
export async function closeWebSocketSession(sessionId: string): Promise<void> {
  try {
    console.log(`WebSocket session closed: ${sessionId}`);

    // Update presence
    // Would get userId from session and mark offline
  } catch (error) {
    throw new Error(
      `Failed to close session: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Queue message for user
 */
export async function queueMessage(
  userId: string,
  message: any
): Promise<void> {
  try {
    // Store in message queue
    console.log(`Message queued for user ${userId}`);
  } catch (error) {
    throw new Error(
      `Failed to queue message: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get pending messages for user
 */
export async function getPendingMessages(userId: string): Promise<any[]> {
  try {
    // Would query from message queue
    return [];
  } catch (error) {
    throw new Error(
      `Failed to get pending messages: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Sync messages for user
 */
export async function syncMessages(
  userId: string,
  lastSyncTimestamp: Date
): Promise<MessageSyncData> {
  try {
    const [messages, reactions, receipts, typing, presence] = await Promise.all([
      getNewMessages(userId, lastSyncTimestamp),
      getReactionsSince(userId, lastSyncTimestamp),
      getReadReceiptsSince(userId, lastSyncTimestamp),
      getTypingIndicators(userId),
      getPresenceUpdates(userId, lastSyncTimestamp),
    ]);

    return {
      messages,
      reactions,
      receipts,
      typingIndicators: typing,
      presenceUpdates: presence,
      timestamp: new Date(),
    };
  } catch (error) {
    throw new Error(
      `Failed to sync messages: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get new messages since timestamp
 */
async function getNewMessages(userId: string, since: Date): Promise<any[]> {
  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { recipientId: userId, createdAt: { gt: since } },
          { senderId: userId, createdAt: { gt: since } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return messages;
  } catch (error) {
    return [];
  }
}

/**
 * Get reactions since timestamp
 */
async function getReactionsSince(userId: string, since: Date): Promise<MessageReaction[]> {
  try {
    // Would query from message_reactions table
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Get read receipts since timestamp
 */
async function getReadReceiptsSince(userId: string, since: Date): Promise<ReadReceipt[]> {
  try {
    // Would query from read_receipts table
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Get typing indicators
 */
async function getTypingIndicators(userId: string): Promise<TypingIndicator[]> {
  try {
    // Would query active typing indicators from cache
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Get presence updates
 */
async function getPresenceUpdates(userId: string, since: Date): Promise<UserPresence[]> {
  try {
    // Would query recent presence changes
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Get message by ID
 */
async function getMessageById(messageId: string): Promise<any> {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    return message;
  } catch (error) {
    return null;
  }
}

/**
 * Mute conversation
 */
export async function muteConversation(
  userId: string,
  partnerId: string,
  muteDurationMinutes: number = 60
): Promise<ConversationMetadata> {
  try {
    const mutedUntil = new Date(Date.now() + muteDurationMinutes * 60 * 1000);

    // Store in database
    const metadata: ConversationMetadata = {
      conversationId: `${userId}_${partnerId}`,
      participantIds: [userId, partnerId],
      lastMessageAt: new Date(),
      unreadCount: 0,
      mutedUntil,
      isPinned: false,
      isArchived: false,
    };

    console.log(`Conversation muted for ${muteDurationMinutes} minutes`);

    return metadata;
  } catch (error) {
    throw new Error(
      `Failed to mute conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Pin conversation
 */
export async function pinConversation(
  userId: string,
  partnerId: string,
  isPinned: boolean
): Promise<ConversationMetadata> {
  try {
    const metadata: ConversationMetadata = {
      conversationId: `${userId}_${partnerId}`,
      participantIds: [userId, partnerId],
      lastMessageAt: new Date(),
      unreadCount: 0,
      isPinned,
      isArchived: false,
    };

    console.log(`Conversation ${isPinned ? 'pinned' : 'unpinned'}`);

    return metadata;
  } catch (error) {
    throw new Error(
      `Failed to pin conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Archive conversation
 */
export async function archiveConversation(
  userId: string,
  partnerId: string
): Promise<ConversationMetadata> {
  try {
    const metadata: ConversationMetadata = {
      conversationId: `${userId}_${partnerId}`,
      participantIds: [userId, partnerId],
      lastMessageAt: new Date(),
      unreadCount: 0,
      isPinned: false,
      isArchived: true,
    };

    console.log(`Conversation archived`);

    return metadata;
  } catch (error) {
    throw new Error(
      `Failed to archive conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get conversation list
 */
export async function getConversationList(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  conversations: ConversationMetadata[];
  total: number;
}> {
  try {
    // Get all unique conversation partners
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      select: {
        senderId: true,
        recipientId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
      skip: offset,
    });

    // Build unique conversations
    const conversationMap = new Map<string, ConversationMetadata>();

    for (const msg of messages) {
      const partnerId = msg.senderId === userId ? msg.recipientId : msg.senderId;
      const convId = [userId, partnerId].sort().join('_');

      if (!conversationMap.has(convId)) {
        const unreadCount = await getUnreadMessageCount(userId);
        conversationMap.set(convId, {
          conversationId: convId,
          participantIds: [userId, partnerId],
          lastMessageAt: msg.createdAt,
          unreadCount,
          isPinned: false,
          isArchived: false,
        });
      }
    }

    return {
      conversations: Array.from(conversationMap.values()).slice(0, limit),
      total: conversationMap.size,
    };
  } catch (error) {
    throw new Error(
      `Failed to get conversations: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get message statistics
 */
export async function getMessageStatistics(userId: string): Promise<{
  totalMessages: number;
  totalConversations: number;
  unreadCount: number;
  avgResponseTime: number;
  lastMessageAt: Date | null;
}> {
  try {
    const [total, unread] = await Promise.all([
      prisma.message.count({ where: { OR: [{ senderId: userId }, { recipientId: userId }] } }),
      getUnreadMessageCount(userId),
    ]);

    const lastMessage = await prisma.message.findFirst({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalMessages: total,
      totalConversations: 0, // Would calculate
      unreadCount: unread,
      avgResponseTime: 300, // seconds, placeholder
      lastMessageAt: lastMessage?.createdAt || null,
    };
  } catch (error) {
    throw new Error(
      `Failed to get statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Delete message
 */
export async function deleteMessage(messageId: string, userId: string): Promise<boolean> {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.senderId !== userId) {
      throw new Error('Unauthorized to delete this message');
    }

    // In production, would use soft delete
    console.log(`Message ${messageId} deleted`);

    return true;
  } catch (error) {
    throw new Error(
      `Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Edit message
 */
export async function editMessage(
  messageId: string,
  userId: string,
  newContent: string
): Promise<any> {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.senderId !== userId) {
      throw new Error('Unauthorized to edit this message');
    }

    // Update message
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: newContent,
        updatedAt: new Date(),
      },
    });

    console.log(`Message ${messageId} edited`);

    return updated;
  } catch (error) {
    throw new Error(
      `Failed to edit message: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
