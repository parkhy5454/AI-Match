import { prisma } from '@/lib/db';
import { Conversation, Message, Prisma } from '@prisma/client';

export interface MessageWithSender extends Message {
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
}

export interface ConversationWithMessages extends Conversation {
  messages?: MessageWithSender[];
  participant1?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
  participant2?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
  lastMessage?: MessageWithSender;
  unreadCount?: number;
}

/**
 * Create or retrieve an existing conversation between two users
 */
export async function createOrGetConversation(
  userId1: string,
  userId2: string
): Promise<Conversation> {
  if (userId1 === userId2) {
    throw new Error('Cannot create conversation with yourself');
  }

  // Normalize user IDs to ensure consistency
  const [normalizedUser1, normalizedUser2] = [userId1, userId2].sort();

  // Check if conversation already exists
  let conversation = await prisma.conversation.findUnique({
    where: {
      userId1_userId2: {
        userId1: normalizedUser1,
        userId2: normalizedUser2,
      },
    },
  });

  if (conversation) {
    return conversation;
  }

  // Create new conversation
  conversation = await prisma.conversation.create({
    data: {
      userId1: normalizedUser1,
      userId2: normalizedUser2,
      isActive: true,
    },
  });

  return conversation;
}

/**
 * Get all conversations for a user with pagination
 */
export async function getUserConversations(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<ConversationWithMessages[]> {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ userId1: userId }, { userId2: userId }],
      isActive: true,
    },
    include: {
      participant1: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      participant2: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      lastMessage: {
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: {
      lastMessageAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  // Add unread count for each conversation
  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conv) => {
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: {
            not: userId,
          },
          isRead: false,
        },
      });
      return {
        ...conv,
        unreadCount,
      };
    })
  );

  return conversationsWithUnread;
}

/**
 * Get a specific conversation with all messages
 */
export async function getConversationWithMessages(
  conversationId: string,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ConversationWithMessages | null> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participant1: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      participant2: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  // Verify user is part of this conversation
  if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
    throw new Error('User is not part of this conversation');
  }

  // Get messages with pagination
  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: limit,
    skip: offset,
  });

  // Mark all messages from the other user as read
  const otherUserId = conversation.userId1 === userId ? conversation.userId2 : conversation.userId1;
  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: otherUserId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    ...conversation,
    messages: messages as MessageWithSender[],
  };
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  imageUrl?: string
): Promise<Message> {
  // Verify conversation exists and user is part of it
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.userId1 !== senderId && conversation.userId2 !== senderId) {
    throw new Error('User is not part of this conversation');
  }

  // Validate content
  if (!content?.trim()) {
    throw new Error('Message content cannot be empty');
  }

  if (content.length > 5000) {
    throw new Error('Message content exceeds maximum length');
  }

  // Create message and update conversation's lastMessageAt
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: content.trim(),
        imageUrl,
        isRead: false,
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
      },
    }),
  ]);

  return message;
}

/**
 * Get message history for a conversation
 */
export async function getMessageHistory(
  conversationId: string,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<MessageWithSender[]> {
  // Verify user is part of conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
    throw new Error('User is not part of this conversation');
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  return messages.reverse() as MessageWithSender[];
}

/**
 * Mark a message as read
 */
export async function markMessageAsRead(
  messageId: string,
  userId: string
): Promise<Message> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  const conversation = message.conversation;
  if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
    throw new Error('User is not part of this conversation');
  }

  // Only mark as read if user is not the sender
  if (message.senderId === userId) {
    return message;
  }

  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return updatedMessage;
}

/**
 * Mark all messages in a conversation as read
 */
export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
    throw new Error('User is not part of this conversation');
  }

  const otherUserId = conversation.userId1 === userId ? conversation.userId2 : conversation.userId1;

  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: otherUserId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(
  messageId: string,
  userId: string
): Promise<Message> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });

  if (!message) {
    throw new Error('Message not found');
  }

  // Only sender can delete their own message
  if (message.senderId !== userId) {
    throw new Error('You can only delete your own messages');
  }

  // Soft delete by clearing content
  const deletedMessage = await prisma.message.update({
    where: { id: messageId },
    data: {
      content: '[deleted]',
      imageUrl: null,
      isDeleted: true,
    },
  });

  return deletedMessage;
}

/**
 * Get unread message count for a user
 */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  const count = await prisma.message.count({
    where: {
      conversation: {
        OR: [
          { userId1: userId },
          { userId2: userId },
        ],
      },
      senderId: {
        not: userId,
      },
      isRead: false,
    },
  });

  return count;
}

/**
 * Get unread conversations for a user
 */
export async function getUnreadConversations(userId: string): Promise<Array<{
  conversationId: string;
  unreadCount: number;
}>> {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { userId1: userId },
        { userId2: userId },
      ],
      isActive: true,
    },
    select: {
      id: true,
      _count: {
        select: {
          messages: {
            where: {
              senderId: {
                not: userId,
              },
              isRead: false,
            },
          },
        },
      },
    },
  });

  return conversations
    .filter((conv) => conv._count.messages > 0)
    .map((conv) => ({
      conversationId: conv.id,
      unreadCount: conv._count.messages,
    }));
}

/**
 * Search messages in a conversation
 */
export async function searchMessages(
  conversationId: string,
  userId: string,
  searchTerm: string,
  limit: number = 20,
  offset: number = 0
): Promise<MessageWithSender[]> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
    throw new Error('User is not part of this conversation');
  }

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      content: {
        contains: searchTerm,
        mode: 'insensitive',
      },
      isDeleted: false,
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  return messages.reverse() as MessageWithSender[];
}

/**
 * Archive a conversation (soft delete)
 */
export async function archiveConversation(
  conversationId: string,
  userId: string
): Promise<Conversation> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
    throw new Error('User is not part of this conversation');
  }

  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      isActive: false,
    },
  });
}

/**
 * Get conversation statistics
 */
export async function getConversationStats(
  conversationId: string,
  userId: string
): Promise<{
  totalMessages: number;
  userMessages: number;
  otherUserMessages: number;
  mediaMessages: number;
  firstMessage: Date | null;
  lastMessage: Date | null;
}> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.userId1 !== userId && conversation.userId2 !== userId) {
    throw new Error('User is not part of this conversation');
  }

  const [totalMessages, userMessages, otherUserMessages, mediaMessages, firstMessage, lastMessage] =
    await Promise.all([
      prisma.message.count({
        where: { conversationId, isDeleted: false },
      }),
      prisma.message.count({
        where: { conversationId, senderId: userId, isDeleted: false },
      }),
      prisma.message.count({
        where: {
          conversationId,
          senderId: { not: userId },
          isDeleted: false,
        },
      }),
      prisma.message.count({
        where: {
          conversationId,
          imageUrl: { not: null },
          isDeleted: false,
        },
      }),
      prisma.message.findFirst({
        where: { conversationId, isDeleted: false },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.message.findFirst({
        where: { conversationId, isDeleted: false },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

  return {
    totalMessages,
    userMessages,
    otherUserMessages,
    mediaMessages,
    firstMessage: firstMessage?.createdAt || null,
    lastMessage: lastMessage?.createdAt || null,
  };
}

/**
 * Mute a conversation
 */
export async function muteConversation(
  userId: string,
  conversationId: string
): Promise<Conversation> {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      isMuted: true,
      mutedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });
}

/**
 * Unmute a conversation
 */
export async function unmuteConversation(
  userId: string,
  conversationId: string
): Promise<Conversation> {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      isMuted: false,
      mutedUntil: null,
    },
  });
}

/**
 * Get messages for a conversation (alias for getMessageHistory)
 */
export async function getMessages(
  conversationId: string,
  limit: number = 50,
  offset: number = 0
): Promise<MessageWithSender[]> {
  return getMessageHistory(conversationId, limit, offset);
}

/**
 * Get conversations for a user (alias for getUserConversations)
 */
export async function getConversations(userId: string): Promise<Conversation[]> {
  return getUserConversations(userId);
}

/**
 * Get unread message count (alias for getUnreadMessageCount)
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return getUnreadMessageCount(userId);
}
