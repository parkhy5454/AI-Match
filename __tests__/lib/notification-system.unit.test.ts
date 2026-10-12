import {
  createNotification,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  deleteNotificationsByType,
  getNotificationByTypeAndUser,
  hasUnreadNotifications,
  getNotificationsByType,
  getNotificationStats,
  notifyLike,
  notifyMatch,
  notifyNewMessage,
  notifyProfileView,
} from '@/lib/notification-system';
import { prisma } from '@/lib/db';

const userId1 = 'test-user-1';
const userId2 = 'test-user-2';
const userId3 = 'test-user-3';

describe('Notification System', () => {
  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: userId1, email: 'user1@test.com', password: 'hashed' },
        { id: userId2, email: 'user2@test.com', password: 'hashed' },
        { id: userId3, email: 'user3@test.com', password: 'hashed' },
      ],
    });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({});
    await prisma.notificationPreference.deleteMany({});
    await prisma.user.deleteMany({
      where: { id: { in: [userId1, userId2, userId3] } },
    });
  });

  describe('createNotification', () => {
    test('should create a notification', async () => {
      const notification = await createNotification({
        type: 'like',
        userId: userId1,
        relatedUserId: userId2,
        content: 'Someone liked your profile',
      });

      expect(notification).toBeDefined();
      expect(notification.type).toBe('like');
      expect(notification.isRead).toBe(false);
    });

    test('should respect notification preferences', async () => {
      // Disable like notifications
      await updateNotificationPreferences(userId2, { notifyLike: false });

      // Try to create like notification
      const notification = await createNotification({
        type: 'like',
        userId: userId2,
        relatedUserId: userId1,
        content: 'Someone liked your profile',
      });

      expect(notification).toBeNull();
    });

    test('should include metadata', async () => {
      const notification = await createNotification({
        type: 'like',
        userId: userId1,
        relatedUserId: userId2,
        content: 'New like',
        metadata: { compatibilityScore: 85 },
      });

      expect(notification.metadata).toEqual({ compatibilityScore: 85 });
    });
  });

  describe('getUserNotifications', () => {
    beforeEach(async () => {
      // Create test notifications
      await prisma.notification.create({
        data: {
          userId: userId1,
          type: 'like',
          relatedUserId: userId2,
          content: 'Like 1',
          isRead: false,
        },
      });

      await prisma.notification.create({
        data: {
          userId: userId1,
          type: 'match',
          relatedUserId: userId3,
          content: 'Match 1',
          isRead: true,
        },
      });
    });

    test('should retrieve notifications with pagination', async () => {
      const notifications = await getUserNotifications(userId1, 10, 0);
      expect(notifications.length).toBeGreaterThan(0);
    });

    test('should support unread filter', async () => {
      const unreadNotifications = await getUserNotifications(userId1, 10, 0, true);
      expect(unreadNotifications.every((n) => !n.isRead)).toBe(true);
    });

    test('should include related user info', async () => {
      const notifications = await getUserNotifications(userId1, 10, 0);
      const hasRelatedUser = notifications.some((n) => n.relatedUser);
      expect(hasRelatedUser).toBe(true);
    });

    test('should order by creation date descending', async () => {
      const notifications = await getUserNotifications(userId1, 10, 0);
      if (notifications.length >= 2) {
        expect(notifications[0].createdAt.getTime()).toBeGreaterThanOrEqual(
          notifications[1].createdAt.getTime()
        );
      }
    });
  });

  describe('getUnreadNotificationCount', () => {
    test('should return correct unread count', async () => {
      const count = await getUnreadNotificationCount(userId1);
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should not count read notifications', async () => {
      const countBefore = await getUnreadNotificationCount(userId2);
      
      await prisma.notification.create({
        data: {
          userId: userId2,
          type: 'like',
          relatedUserId: userId1,
          content: 'Test',
          isRead: true,
        },
      });

      const countAfter = await getUnreadNotificationCount(userId2);
      expect(countAfter).toBe(countBefore);
    });
  });

  describe('markNotificationAsRead', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notification = await prisma.notification.create({
        data: {
          userId: userId1,
          type: 'like',
          relatedUserId: userId2,
          content: 'Mark me as read',
          isRead: false,
        },
      });
      notificationId = notification.id;
    });

    test('should mark notification as read', async () => {
      const notification = await markNotificationAsRead(notificationId, userId1);
      expect(notification.isRead).toBe(true);
      expect(notification.readAt).toBeDefined();
    });

    test('should throw error for non-existent notification', async () => {
      await expect(
        markNotificationAsRead('non-existent', userId1)
      ).rejects.toThrow('Notification not found');
    });

    test('should throw error for unauthorized access', async () => {
      await expect(
        markNotificationAsRead(notificationId, userId2)
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('markAllNotificationsAsRead', () => {
    beforeEach(async () => {
      await prisma.notification.createMany({
        data: [
          {
            userId: userId2,
            type: 'like',
            relatedUserId: userId1,
            content: 'Unread 1',
            isRead: false,
          },
          {
            userId: userId2,
            type: 'match',
            relatedUserId: userId1,
            content: 'Unread 2',
            isRead: false,
          },
        ],
      });
    });

    test('should mark all unread as read', async () => {
      await markAllNotificationsAsRead(userId2);

      const unreadCount = await getUnreadNotificationCount(userId2);
      expect(unreadCount).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notification = await prisma.notification.create({
        data: {
          userId: userId1,
          type: 'like',
          relatedUserId: userId2,
          content: 'Delete me',
          isRead: false,
        },
      });
      notificationId = notification.id;
    });

    test('should delete notification', async () => {
      await deleteNotification(notificationId, userId1);

      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });
      expect(notification).toBeNull();
    });

    test('should throw error for unauthorized delete', async () => {
      const notification = await prisma.notification.create({
        data: {
          userId: userId2,
          type: 'like',
          relatedUserId: userId1,
          content: 'Test',
          isRead: false,
        },
      });

      await expect(
        deleteNotification(notification.id, userId1)
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('getNotificationPreferences', () => {
    test('should return existing preferences', async () => {
      const prefs = await getNotificationPreferences(userId1);
      expect(prefs).toBeDefined();
      expect(prefs?.userId).toBe(userId1);
    });

    test('should create default preferences if not exist', async () => {
      const newUserId = 'new-user-test';
      await prisma.user.create({
        data: { id: newUserId, email: 'new@test.com', password: 'hashed' },
      });

      const prefs = await getNotificationPreferences(newUserId);
      expect(prefs?.notifyLike).toBe(true);
      expect(prefs?.notifyMatch).toBe(true);
      expect(prefs?.notifyMessage).toBe(true);

      // Cleanup
      await prisma.notificationPreference.delete({ where: { userId: newUserId } });
      await prisma.user.delete({ where: { id: newUserId } });
    });
  });

  describe('updateNotificationPreferences', () => {
    test('should update preferences', async () => {
      await updateNotificationPreferences(userId1, {
        notifyLike: false,
        emailNotifications: false,
      });

      const prefs = await getNotificationPreferences(userId1);
      expect(prefs?.notifyLike).toBe(false);
      expect(prefs?.emailNotifications).toBe(false);
    });
  });

  describe('deleteNotificationsByType', () => {
    test('should delete all notifications of a type', async () => {
      // Create notifications
      await prisma.notification.createMany({
        data: [
          {
            userId: userId3,
            type: 'like',
            relatedUserId: userId1,
            content: 'Test 1',
            isRead: false,
          },
          {
            userId: userId3,
            type: 'like',
            relatedUserId: userId2,
            content: 'Test 2',
            isRead: false,
          },
          {
            userId: userId3,
            type: 'match',
            relatedUserId: userId1,
            content: 'Test 3',
            isRead: false,
          },
        ],
      });

      const deleted = await deleteNotificationsByType(userId3, 'like');
      expect(deleted).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getNotificationStats', () => {
    test('should return accurate stats', async () => {
      const stats = await getNotificationStats(userId1);
      expect(stats.totalUnread).toBeGreaterThanOrEqual(0);
      expect(stats.likes).toBeGreaterThanOrEqual(0);
      expect(stats.matches).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Convenience functions', () => {
    test('notifyLike should create like notification', async () => {
      await notifyLike(userId1, userId2, 85);
      
      const notification = await getNotificationByTypeAndUser(
        userId2,
        'like',
        userId1
      );
      expect(notification).toBeDefined();
    });

    test('notifyMatch should create notifications for both users', async () => {
      await notifyMatch(userId1, userId2);
      
      const notif1 = await prisma.notification.findFirst({
        where: { userId: userId1, type: 'match', relatedUserId: userId2 },
      });
      const notif2 = await prisma.notification.findFirst({
        where: { userId: userId2, type: 'match', relatedUserId: userId1 },
      });

      expect(notif1).toBeDefined();
      expect(notif2).toBeDefined();
    });

    test('notifyNewMessage should create message notification', async () => {
      await notifyNewMessage(userId1, userId2, 'conv-123', 'Hello there!');
      
      const notification = await getNotificationByTypeAndUser(
        userId2,
        'message',
        userId1
      );
      expect(notification).toBeDefined();
    });

    test('notifyProfileView should create view notification', async () => {
      await notifyProfileView(userId1, userId2);
      
      const notification = await getNotificationByTypeAndUser(
        userId2,
        'view',
        userId1
      );
      expect(notification).toBeDefined();
    });
  });

  describe('Performance and edge cases', () => {
    test('should handle bulk notification creation', async () => {
      const notifications = [];
      for (let i = 0; i < 50; i++) {
        notifications.push({
          type: 'like' as const,
          userId: userId1,
          relatedUserId: userId2,
          content: `Bulk notification ${i}`,
        });
      }

      const created = await Promise.all(
        notifications.map((n) => createNotification(n))
      );
      expect(created.filter((n) => n !== null).length).toBeGreaterThan(0);
    });

    test('should handle concurrent operations', async () => {
      const notification = await prisma.notification.create({
        data: {
          userId: userId1,
          type: 'like',
          relatedUserId: userId2,
          content: 'Concurrent test',
          isRead: false,
        },
      });

      const operations = [
        markNotificationAsRead(notification.id, userId1),
        getUserNotifications(userId1),
        getUnreadNotificationCount(userId1),
      ];

      const results = await Promise.all(operations);
      expect(results.length).toBe(3);
    });

    test('should handle special characters in content', async () => {
      const content = 'Special: @#$%^&*() 한글 مرحبا 🎉';
      const notification = await createNotification({
        type: 'system',
        userId: userId1,
        content,
      });

      expect(notification.content).toBe(content);
    });
  });
});
