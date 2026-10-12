import {
  createOrGetConversation,
  getUserConversations,
  getConversationWithMessages,
  sendMessage,
  getMessageHistory,
  markMessageAsRead,
  markConversationAsRead,
  deleteMessage,
  getUnreadMessageCount,
  getUnreadConversations,
  searchMessages,
  archiveConversation,
  getConversationStats,
} from '@/lib/messaging-system';
import { prisma } from '@/lib/db';

// Mock data for testing
const userId1 = 'test-user-1';
const userId2 = 'test-user-2';
const userId3 = 'test-user-3';

describe('Messaging System', () => {
  beforeAll(async () => {
    // Create test users
    await prisma.user.createMany({
      data: [
        { id: userId1, email: 'user1@test.com', password: 'hashed' },
        { id: userId2, email: 'user2@test.com', password: 'hashed' },
        { id: userId3, email: 'user3@test.com', password: 'hashed' },
      ],
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.user.deleteMany({
      where: { id: { in: [userId1, userId2, userId3] } },
    });
  });

  describe('createOrGetConversation', () => {
    test('should create a new conversation between two users', async () => {
      const conversation = await createOrGetConversation(userId1, userId2);
      expect(conversation).toBeDefined();
      expect(conversation.isActive).toBe(true);
    });

    test('should retrieve existing conversation', async () => {
      const conversation1 = await createOrGetConversation(userId1, userId2);
      const conversation2 = await createOrGetConversation(userId2, userId1);
      expect(conversation1.id).toBe(conversation2.id);
    });

    test('should throw error when creating conversation with self', async () => {
      await expect(createOrGetConversation(userId1, userId1)).rejects.toThrow(
        'Cannot create conversation with yourself'
      );
    });

    test('should normalize user order for consistency', async () => {
      const conv1 = await createOrGetConversation(userId1, userId3);
      const conv2 = await createOrGetConversation(userId3, userId1);
      expect(conv1.id).toBe(conv2.id);
    });
  });

  describe('sendMessage', () => {
    let conversationId: string;

    beforeEach(async () => {
      const conversation = await createOrGetConversation(userId1, userId2);
      conversationId = conversation.id;
    });

    test('should send a message', async () => {
      const message = await sendMessage(conversationId, userId1, 'Hello');
      expect(message.content).toBe('Hello');
      expect(message.senderId).toBe(userId1);
      expect(message.isRead).toBe(false);
    });

    test('should trim message content', async () => {
      const message = await sendMessage(conversationId, userId1, '  Hello  ');
      expect(message.content).toBe('Hello');
    });

    test('should throw error for empty message', async () => {
      await expect(
        sendMessage(conversationId, userId1, '')
      ).rejects.toThrow('Message content cannot be empty');
    });

    test('should throw error for message exceeding max length', async () => {
      const longContent = 'a'.repeat(5001);
      await expect(
        sendMessage(conversationId, userId1, longContent)
      ).rejects.toThrow('Message content exceeds maximum length');
    });

    test('should update conversation lastMessageAt', async () => {
      const timeBefore = new Date();
      await sendMessage(conversationId, userId1, 'Test message');
      
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      expect(conversation?.lastMessageAt.getTime()).toBeGreaterThanOrEqual(
        timeBefore.getTime()
      );
    });

    test('should support optional image URL', async () => {
      const message = await sendMessage(
        conversationId,
        userId1,
        'Check this out',
        'https://example.com/image.jpg'
      );
      expect(message.imageUrl).toBe('https://example.com/image.jpg');
    });
  });

  describe('getMessageHistory', () => {
    let conversationId: string;

    beforeEach(async () => {
      const conversation = await createOrGetConversation(userId1, userId2);
      conversationId = conversation.id;

      // Send multiple messages
      for (let i = 0; i < 5; i++) {
        await sendMessage(conversationId, i % 2 === 0 ? userId1 : userId2, `Message ${i}`);
      }
    });

    test('should retrieve message history in order', async () => {
      const messages = await getMessageHistory(conversationId, userId1);
      expect(messages.length).toBe(5);
      expect(messages[0].content).toBe('Message 0');
      expect(messages[4].content).toBe('Message 4');
    });

    test('should support pagination', async () => {
      const page1 = await getMessageHistory(conversationId, userId1, 2, 0);
      const page2 = await getMessageHistory(conversationId, userId1, 2, 2);
      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    test('should include sender information', async () => {
      const messages = await getMessageHistory(conversationId, userId1);
      expect(messages[0].sender).toBeDefined();
      expect(messages[0].sender?.id).toBe(userId1);
    });
  });

  describe('markMessageAsRead', () => {
    let conversationId: string;
    let messageId: string;

    beforeEach(async () => {
      const conversation = await createOrGetConversation(userId1, userId2);
      conversationId = conversation.id;
      const message = await sendMessage(conversationId, userId1, 'Read me');
      messageId = message.id;
    });

    test('should mark message as read', async () => {
      const message = await markMessageAsRead(messageId, userId2);
      expect(message.isRead).toBe(true);
      expect(message.readAt).toBeDefined();
    });

    test('should not mark sender message as read', async () => {
      const message = await markMessageAsRead(messageId, userId1);
      expect(message.isRead).toBe(false);
    });

    test('should throw error for non-existent message', async () => {
      await expect(
        markMessageAsRead('non-existent-id', userId2)
      ).rejects.toThrow('Message not found');
    });
  });

  describe('markConversationAsRead', () => {
    let conversationId: string;

    beforeEach(async () => {
      const conversation = await createOrGetConversation(userId1, userId2);
      conversationId = conversation.id;

      // Send multiple messages from user1
      for (let i = 0; i < 3; i++) {
        await sendMessage(conversationId, userId1, `Message ${i}`);
      }
    });

    test('should mark all unread messages as read', async () => {
      await markConversationAsRead(conversationId, userId2);

      const messages = await prisma.message.findMany({
        where: { conversationId },
      });
      expect(messages.every((m) => m.isRead === true)).toBe(true);
    });
  });

  describe('deleteMessage', () => {
    let conversationId: string;
    let messageId: string;

    beforeEach(async () => {
      const conversation = await createOrGetConversation(userId1, userId2);
      conversationId = conversation.id;
      const message = await sendMessage(conversationId, userId1, 'Delete me');
      messageId = message.id;
    });

    test('should soft delete a message', async () => {
      const message = await deleteMessage(messageId, userId1);
      expect(message.content).toBe('[deleted]');
      expect(message.imageUrl).toBeNull();
      expect(message.isDeleted).toBe(true);
    });

    test('should not allow non-sender to delete', async () => {
      await expect(deleteMessage(messageId, userId2)).rejects.toThrow(
        'You can only delete your own messages'
      );
    });
  });

  describe('getUnreadMessageCount', () => {
    test('should return correct unread count', async () => {
      const conversation = await createOrGetConversation(userId1, userId2);
      
      // Send messages from user1
      await sendMessage(conversation.id, userId1, 'Unread 1');
      await sendMessage(conversation.id, userId1, 'Unread 2');

      const count = await getUnreadMessageCount(userId2);
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('should not count own messages', async () => {
      const conversation = await createOrGetConversation(userId2, userId3);
      
      // Send message from user2
      await sendMessage(conversation.id, userId2, 'My message');

      const count = await getUnreadMessageCount(userId2);
      expect(count).toBe(0);
    });
  });

  describe('getUnreadConversations', () => {
    test('should return conversations with unread messages', async () => {
      const conversation = await createOrGetConversation(userId1, userId2);
      await sendMessage(conversation.id, userId1, 'Unread message');

      const unreadConvs = await getUnreadConversations(userId2);
      expect(unreadConvs.length).toBeGreaterThan(0);
      expect(unreadConvs[0].unreadCount).toBeGreaterThan(0);
    });
  });

  describe('searchMessages', () => {
    let conversationId: string;

    beforeEach(async () => {
      const conversation = await createOrGetConversation(userId1, userId2);
      conversationId = conversation.id;

      await sendMessage(conversationId, userId1, 'Hello there');
      await sendMessage(conversationId, userId2, 'Hi back');
      await sendMessage(conversationId, userId1, 'How are you?');
    });

    test('should search messages by content', async () => {
      const results = await searchMessages(conversationId, userId1, 'Hello', 10, 0);
      expect(results.length).toBe(1);
      expect(results[0].content).toBe('Hello there');
    });

    test('should perform case-insensitive search', async () => {
      const results = await searchMessages(conversationId, userId1, 'HELLO', 10, 0);
      expect(results.length).toBe(1);
    });

    test('should support pagination in search', async () => {
      const results = await searchMessages(conversationId, userId1, 'e', 1, 0);
      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('archiveConversation', () => {
    let conversationId: string;

    beforeEach(async () => {
      const conversation = await createOrGetConversation(userId1, userId2);
      conversationId = conversation.id;
    });

    test('should archive a conversation', async () => {
      const archived = await archiveConversation(conversationId, userId1);
      expect(archived.isActive).toBe(false);
    });

    test('should prevent unauthorized archive', async () => {
      const conversation = await createOrGetConversation(userId2, userId3);
      await expect(
        archiveConversation(conversation.id, userId1)
      ).rejects.toThrow('User is not part of this conversation');
    });
  });

  describe('getConversationStats', () => {
    let conversationId: string;

    beforeEach(async () => {
      const conversation = await createOrGetConversation(userId1, userId2);
      conversationId = conversation.id;

      // Send various messages
      await sendMessage(conversationId, userId1, 'Message 1');
      await sendMessage(conversationId, userId2, 'Message 2');
      await sendMessage(conversationId, userId1, 'Check image', 'https://example.com/img.jpg');
    });

    test('should return accurate statistics', async () => {
      const stats = await getConversationStats(conversationId, userId1);
      expect(stats.totalMessages).toBe(3);
      expect(stats.userMessages).toBe(2);
      expect(stats.otherUserMessages).toBe(1);
      expect(stats.mediaMessages).toBe(1);
    });

    test('should include timestamp range', async () => {
      const stats = await getConversationStats(conversationId, userId1);
      expect(stats.firstMessage).toBeDefined();
      expect(stats.lastMessage).toBeDefined();
    });
  });

  describe('getUserConversations', () => {
    test('should list all user conversations with pagination', async () => {
      const conv1 = await createOrGetConversation(userId1, userId2);
      const conv2 = await createOrGetConversation(userId1, userId3);

      const conversations = await getUserConversations(userId1, 10, 0);
      expect(conversations.length).toBeGreaterThanOrEqual(2);
    });

    test('should include unread count', async () => {
      const conversation = await createOrGetConversation(userId1, userId2);
      await sendMessage(conversation.id, userId1, 'Unread');

      const conversations = await getUserConversations(userId2);
      const conv = conversations.find((c) => c.id === conversation.id);
      expect(conv?.unreadCount).toBeGreaterThan(0);
    });

    test('should order by most recent first', async () => {
      const conv1 = await createOrGetConversation(userId1, userId2);
      await sendMessage(conv1.id, userId1, 'Old message');

      // Wait a bit and send a newer message
      await new Promise((resolve) => setTimeout(resolve, 100));
      const conv2 = await createOrGetConversation(userId1, userId3);
      await sendMessage(conv2.id, userId1, 'New message');

      const conversations = await getUserConversations(userId1);
      expect(conversations[0].id).toBe(conv2.id);
    });
  });

  describe('getConversationWithMessages', () => {
    let conversationId: string;

    beforeEach(async () => {
      const conversation = await createOrGetConversation(userId1, userId2);
      conversationId = conversation.id;

      for (let i = 0; i < 3; i++) {
        await sendMessage(conversationId, userId1, `Message ${i}`);
      }
    });

    test('should return conversation with messages', async () => {
      const conv = await getConversationWithMessages(conversationId, userId2);
      expect(conv).toBeDefined();
      expect(conv?.messages?.length).toBeGreaterThan(0);
    });

    test('should mark messages as read for recipient', async () => {
      await getConversationWithMessages(conversationId, userId2);

      const messages = await prisma.message.findMany({
        where: { conversationId, senderId: userId1 },
      });
      expect(messages.every((m) => m.isRead)).toBe(true);
    });

    test('should throw error for unauthorized access', async () => {
      await expect(
        getConversationWithMessages(conversationId, userId3)
      ).rejects.toThrow('User is not part of this conversation');
    });
  });

  describe('Performance and edge cases', () => {
    test('should handle high volume of messages efficiently', async () => {
      const conversation = await createOrGetConversation(userId1, userId2);
      
      const start = Date.now();
      const messagePromises = [];
      for (let i = 0; i < 100; i++) {
        messagePromises.push(
          sendMessage(conversation.id, userId1, `Message ${i}`)
        );
      }
      await Promise.all(messagePromises);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    test('should handle concurrent operations safely', async () => {
      const conversation = await createOrGetConversation(userId1, userId2);
      
      // Simulate concurrent read/write operations
      const operations = [
        sendMessage(conversation.id, userId1, 'Concurrent 1'),
        sendMessage(conversation.id, userId2, 'Concurrent 2'),
        markConversationAsRead(conversation.id, userId1),
        getMessageHistory(conversation.id, userId1),
      ];

      const results = await Promise.all(operations);
      expect(results.length).toBe(4);
    });

    test('should handle special characters in messages', async () => {
      const conversation = await createOrGetConversation(userId1, userId2);
      const specialContent = 'Hello! @#$%^&*() 한글 مرحبا';
      
      const message = await sendMessage(conversation.id, userId1, specialContent);
      expect(message.content).toBe(specialContent);
    });
  });
});
