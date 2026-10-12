import { prisma } from '@/lib/db';
import { Notification, NotificationPreference, Prisma } from '@prisma/client';

export type NotificationType = 
  | 'like' 
  | 'match' 
  | 'message' 
  | 'view' 
  | 'message_request'
  | 'visit'
  | 'system';

export interface NotificationPayload {
  type: NotificationType;
  userId: string;
  relatedUserId?: string;
  relatedId?: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface NotificationWithRelated extends Notification {
  relatedUser?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
}

/**
 * Create a notification
 */
export async function createNotification(
  payload: NotificationPayload
): Promise<Notification> {
  // Check if user has notifications enabled for this type
  const preferences = await getNotificationPreferences(payload.userId);
  
  if (!isNotificationTypeEnabled(payload.type, preferences)) {
    return null as any; // Silently skip if disabled
  }

  const notification = await prisma.notification.create({
    data: {
      userId: payload.userId,
      type: payload.type,
      relatedUserId: payload.relatedUserId,
      relatedId: payload.relatedId,
      content: payload.content,
      metadata: payload.metadata || {},
      isRead: false,
    },
  });

  return notification;
}

/**
 * Check if notification type is enabled
 */
function isNotificationTypeEnabled(
  type: NotificationType,
  preferences: NotificationPreference | null
): boolean {
  if (!preferences) return true; // Default: enabled

  switch (type) {
    case 'like':
      return preferences.notifyLike;
    case 'match':
      return preferences.notifyMatch;
    case 'message':
      return preferences.notifyMessage;
    case 'view':
      return preferences.notifyView;
    case 'visit':
      return preferences.notifyVisit;
    case 'message_request':
      return preferences.notifyMessage;
    case 'system':
      return true; // Always enabled
    default:
      return true;
  }
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 20,
  offset: number = 0,
  unreadOnly: boolean = false
): Promise<NotificationWithRelated[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly && { isRead: false }),
    },
    include: {
      relatedUser: {
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

  return notifications as NotificationWithRelated[];
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const count = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return count;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<Notification> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  if (notification.userId !== userId) {
    throw new Error('Unauthorized');
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  if (notification.userId !== userId) {
    throw new Error('Unauthorized');
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });
}

/**
 * Delete all notifications of a type for a user
 */
export async function deleteNotificationsByType(
  userId: string,
  type: NotificationType
): Promise<number> {
  const result = await prisma.notification.deleteMany({
    where: {
      userId,
      type,
    },
  });

  return result.count;
}

/**
 * Get or create notification preferences
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreference | null> {
  let preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!preferences) {
    preferences = await prisma.notificationPreference.create({
      data: {
        userId,
        notifyLike: true,
        notifyMatch: true,
        notifyMessage: true,
        notifyView: true,
        notifyVisit: true,
        emailNotifications: true,
        pushNotifications: true,
        emailDigest: 'daily', // daily, weekly, off
        doNotDisturbStart: null,
        doNotDisturbEnd: null,
      },
    });
  }

  return preferences;
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<NotificationPreference>
): Promise<NotificationPreference> {
  // Ensure preferences exist
  await getNotificationPreferences(userId);

  return prisma.notificationPreference.update({
    where: { userId },
    data: updates,
  });
}

/**
 * Create batch notifications for multiple users
 */
export async function createBatchNotifications(
  notifications: NotificationPayload[]
): Promise<Notification[]> {
  const createdNotifications = await Promise.all(
    notifications.map((payload) => createNotification(payload))
  );

  return createdNotifications.filter((n) => n !== null);
}

/**
 * Get notification by type and related user
 */
export async function getNotificationByTypeAndUser(
  userId: string,
  type: NotificationType,
  relatedUserId: string
): Promise<Notification | null> {
  return prisma.notification.findFirst({
    where: {
      userId,
      type,
      relatedUserId,
      isRead: false,
    },
  });
}

/**
 * Check if user has unread notifications
 */
export async function hasUnreadNotifications(userId: string): Promise<boolean> {
  const count = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
    take: 1,
  });

  return count > 0;
}

/**
 * Get notifications by type
 */
export async function getNotificationsByType(
  userId: string,
  type: NotificationType,
  limit: number = 20,
  offset: number = 0
): Promise<NotificationWithRelated[]> {
  return prisma.notification.findMany({
    where: {
      userId,
      type,
    },
    include: {
      relatedUser: {
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
  }) as Promise<NotificationWithRelated[]>;
}

/**
 * Clean up old read notifications (older than 30 days)
 */
export async function cleanupOldNotifications(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.notification.deleteMany({
    where: {
      isRead: true,
      readAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

/**
 * Get notification statistics for user
 */
export async function getNotificationStats(userId: string): Promise<{
  totalUnread: number;
  likes: number;
  matches: number;
  messages: number;
  views: number;
}> {
  const [unreadCount, likeCount, matchCount, messageCount, viewCount] =
    await Promise.all([
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
      prisma.notification.count({
        where: { userId, type: 'like', isRead: false },
      }),
      prisma.notification.count({
        where: { userId, type: 'match', isRead: false },
      }),
      prisma.notification.count({
        where: { userId, type: 'message', isRead: false },
      }),
      prisma.notification.count({
        where: { userId, type: 'view', isRead: false },
      }),
    ]);

  return {
    totalUnread: unreadCount,
    likes: likeCount,
    matches: matchCount,
    messages: messageCount,
    views: viewCount,
  };
}

/**
 * Check if should send notification based on do-not-disturb
 */
export async function shouldSendNotification(userId: string): Promise<boolean> {
  const preferences = await getNotificationPreferences(userId);

  if (!preferences || (!preferences.emailNotifications && !preferences.pushNotifications)) {
    return false;
  }

  // Check do-not-disturb times
  if (preferences.doNotDisturbStart && preferences.doNotDisturbEnd) {
    const now = new Date();
    const hour = now.getHours();

    const startHour = parseInt(preferences.doNotDisturbStart.toString().split(':')[0]);
    const endHour = parseInt(preferences.doNotDisturbEnd.toString().split(':')[0]);

    if (startHour < endHour) {
      // Normal range (e.g., 22:00 to 08:00)
      if (hour >= startHour || hour < endHour) {
        return false;
      }
    } else {
      // Overnight range (e.g., 22:00 to 08:00 next day)
      if (hour >= startHour && hour < endHour) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Create notification for like event
 */
export async function notifyLike(likerId: string, likedId: string, compatibilityScore: number): Promise<void> {
  await createNotification({
    type: 'like',
    userId: likedId,
    relatedUserId: likerId,
    content: `Someone liked your profile! (${compatibilityScore}% compatible)`,
    metadata: { compatibilityScore },
  });
}

/**
 * Create notification for match event
 */
export async function notifyMatch(userId1: string, userId2: string): Promise<void> {
  await Promise.all([
    createNotification({
      type: 'match',
      userId: userId1,
      relatedUserId: userId2,
      content: `You have a new match!`,
    }),
    createNotification({
      type: 'match',
      userId: userId2,
      relatedUserId: userId1,
      content: `You have a new match!`,
    }),
  ]);
}

/**
 * Create notification for new message
 */
export async function notifyNewMessage(
  senderId: string,
  recipientId: string,
  conversationId: string,
  messagePreview: string
): Promise<void> {
  await createNotification({
    type: 'message',
    userId: recipientId,
    relatedUserId: senderId,
    relatedId: conversationId,
    content: `New message: ${messagePreview.substring(0, 50)}...`,
    metadata: { preview: messagePreview },
  });
}

/**
 * Create notification for profile view
 */
export async function notifyProfileView(viewerId: string, viewedId: string): Promise<void> {
  await createNotification({
    type: 'view',
    userId: viewedId,
    relatedUserId: viewerId,
    content: `Someone viewed your profile`,
  });
}

/**
 * FCM Token Management
 */
export async function saveFcmToken(userId: string, token: string): Promise<void> {
  try {
    // Find or create FCM token record
    await prisma.fcmToken.upsert({
      where: { token },
      create: {
        userId,
        token,
      },
      update: {
        userId,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to save FCM token:', error);
  }
}

export async function removeFcmToken(userId: string, token: string): Promise<void> {
  try {
    await prisma.fcmToken.deleteMany({
      where: {
        userId,
        token,
      },
    });
  } catch (error) {
    console.error('Failed to remove FCM token:', error);
  }
}

export async function getFcmTokens(userId: string): Promise<string[]> {
  try {
    const tokens = await prisma.fcmToken.findMany({
      where: { userId },
      select: { token: true },
    });
    return tokens.map((t) => t.token);
  } catch (error) {
    console.error('Failed to get FCM tokens:', error);
    return [];
  }
}

/**
 * Send push notification via Firebase
 */
export async function sendNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    const tokens = await getFcmTokens(userId);

    if (tokens.length === 0) {
      return;
    }

    // Firebase notification sending would happen here
    // This is a placeholder - implement with firebase-admin
    console.log(`Sending notification to ${userId}: ${title}`);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

/**
 * Alias exports for function name compatibility
 */
export const getNotifications = getUserNotifications;
export const getNotificationStatistics = getNotificationStats;
