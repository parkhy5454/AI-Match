/**
 * Undelivered Message Queue Utilities
 * 오프라인 사용자를 위한 미배달 메시지 관리
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 미배달 메시지 통계
 */
export async function getUndeliveredMessageStats(userId: string) {
  try {
    const [undeliveredCount, oldestMessage] = await Promise.all([
      prisma.undeliveredMessage.count({
        where: {
          recipientId: userId,
          isDelivered: false,
        },
      }),
      prisma.undeliveredMessage.findFirst({
        where: {
          recipientId: userId,
          isDelivered: false,
        },
        orderBy: { queuedAt: 'asc' },
      }),
    ]);

    return {
      undeliveredCount,
      oldestMessageDate: oldestMessage?.queuedAt,
      estimatedAge: oldestMessage ? Date.now() - oldestMessage.queuedAt.getTime() : 0,
    };
  } catch (error) {
    console.error('[UndeliveredQueue] Stats error:', error);
    return {
      undeliveredCount: 0,
      oldestMessageDate: null,
      estimatedAge: 0,
    };
  }
}

/**
 * 미배달 1:1 메시지 자동 재시도
 * (배달 실패 시 일정 시간 후 재시도)
 */
export async function retryFailedDeliveries() {
  try {
    const retryableMessages = await prisma.undeliveredMessage.findMany({
      where: {
        isDelivered: false,
        deliveryAttempts: { lt: 5 }, // 최대 5회 시도
        lastAttemptAt: {
          // 마지막 시도 이후 5분이 지난 메시지
          lt: new Date(Date.now() - 5 * 60 * 1000),
        },
      },
      orderBy: { queuedAt: 'asc' },
      take: 50,
    });

    console.log(`[UndeliveredQueue] Retrying ${retryableMessages.length} failed deliveries`);

    for (const message of retryableMessages) {
      await prisma.undeliveredMessage.update({
        where: { id: message.id },
        data: {
          deliveryAttempts: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });
    }

    return retryableMessages.length;
  } catch (error) {
    console.error('[UndeliveredQueue] Retry error:', error);
    return 0;
  }
}

/**
 * 오래된 미배달 메시지 정리 (7일 이상)
 */
export async function cleanupOldUndeliveredMessages(daysOld: number = 7) {
  try {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const deleted1to1 = await prisma.undeliveredMessage.deleteMany({
      where: {
        queuedAt: { lt: cutoffDate },
      },
    });

    const deletedGroup = await prisma.undeliveredGroupMessage.deleteMany({
      where: {
        queuedAt: { lt: cutoffDate },
      },
    });

    console.log(
      `[UndeliveredQueue] Cleaned up ${deleted1to1.count} 1:1 messages and ${deletedGroup.count} group messages older than ${daysOld} days`
    );

    return {
      deleted1to1: deleted1to1.count,
      deletedGroup: deletedGroup.count,
    };
  } catch (error) {
    console.error('[UndeliveredQueue] Cleanup error:', error);
    return { deleted1to1: 0, deletedGroup: 0 };
  }
}

/**
 * 특정 사용자의 미배달 메시지 조회
 */
export async function getUndeliveredMessagesForUser(userId: string, limit: number = 50) {
  try {
    const messages = await prisma.undeliveredMessage.findMany({
      where: {
        recipientId: userId,
        isDelivered: false,
      },
      orderBy: { queuedAt: 'asc' },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
      },
    });

    return messages;
  } catch (error) {
    console.error('[UndeliveredQueue] Fetch error:', error);
    return [];
  }
}

/**
 * 미배달 메시지를 배달됨으로 표시
 */
export async function markAsDelivered(messageIds: string[]) {
  try {
    const result = await prisma.undeliveredMessage.updateMany({
      where: {
        id: { in: messageIds },
      },
      data: {
        isDelivered: true,
        deliveredAt: new Date(),
      },
    });

    return result.count;
  } catch (error) {
    console.error('[UndeliveredQueue] Mark as delivered error:', error);
    return 0;
  }
}

/**
 * 모든 사용자의 온라인/오프라인 상태 조회
 */
export async function getAllOnlineStatuses() {
  try {
    return await prisma.onlineStatus.findMany({
      where: { isOnline: true },
    });
  } catch (error) {
    console.error('[OnlineStatus] Fetch error:', error);
    return [];
  }
}

/**
 * 특정 기간 동안 오프라인이었던 사용자 조회
 */
export async function getOfflineUsers(minutesAgo: number = 60) {
  try {
    const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);

    return await prisma.onlineStatus.findMany({
      where: {
        isOnline: false,
        lastSeen: { lt: cutoffTime },
      },
      orderBy: { lastSeen: 'asc' },
    });
  } catch (error) {
    console.error('[OnlineStatus] Offline users fetch error:', error);
    return [];
  }
}

export default {
  getUndeliveredMessageStats,
  retryFailedDeliveries,
  cleanupOldUndeliveredMessages,
  getUndeliveredMessagesForUser,
  markAsDelivered,
  getAllOnlineStatuses,
  getOfflineUsers,
};
