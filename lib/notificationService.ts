import { db } from "@/lib/db";

/**
 * 알림 생성 유틸리티
 */

export interface NotificationData {
  userId: string;
  type: "like" | "match" | "message" | "system";
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * 알림 생성
 */
export async function createNotification({
  userId,
  type,
  title,
  body,
  data,
}: NotificationData) {
  try {
    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data ? JSON.stringify(data) : null,
      },
    });
    console.log("[NotificationService] 알림 생성됨:", notification.id);
    return notification;
  } catch (error) {
    console.error("[NotificationService] 알림 생성 실패:", error);
    throw error;
  }
}

/**
 * 좋아요 알림 생성
 */
export async function createLikeNotification(
  toUserId: string,
  fromUsername: string,
  fromUserId: string
) {
  return createNotification({
    userId: toUserId,
    type: "like",
    title: "새로운 좋아요",
    body: `${fromUsername}님이 당신을 좋아합니다`,
    data: { fromUserId },
  });
}

/**
 * 매칭 알림 생성
 */
export async function createMatchNotification(
  toUserId: string,
  fromUsername: string,
  matchId: string
) {
  return createNotification({
    userId: toUserId,
    type: "match",
    title: "새로운 매칭",
    body: `${fromUsername}님과 매칭되었습니다`,
    data: { matchId },
  });
}

/**
 * 메시지 알림 생성
 */
export async function createMessageNotification(
  toUserId: string,
  fromUsername: string,
  fromUserId: string,
  messagePreview: string
) {
  return createNotification({
    userId: toUserId,
    type: "message",
    title: "새로운 메시지",
    body: `${fromUsername}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? "..." : ""}`,
    data: { fromUserId, messagePreview },
  });
}

/**
 * 시스템 알림 생성
 */
export async function createSystemNotification(
  toUserId: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  return createNotification({
    userId: toUserId,
    type: "system",
    title,
    body,
    data,
  });
}

/**
 * 읽지 않은 알림 개수 조회
 */
export async function getUnreadNotificationCount(userId: string) {
  try {
    const count = await db.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
    return count;
  } catch (error) {
    console.error("[NotificationService] 읽지 않은 알림 개수 조회 실패:", error);
    throw error;
  }
}

/**
 * 모든 알림 읽음 표시
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const result = await db.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
    console.log("[NotificationService] 모든 알림 읽음 표시:", result.count);
    return result;
  } catch (error) {
    console.error("[NotificationService] 알림 일괄 읽음 표시 실패:", error);
    throw error;
  }
}

/**
 * 오래된 알림 삭제 (7일 이상)
 */
export async function deleteOldNotifications(daysOld: number = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        isRead: true,
      },
    });
    console.log("[NotificationService] 오래된 알림 삭제됨:", result.count);
    return result;
  } catch (error) {
    console.error("[NotificationService] 오래된 알림 삭제 실패:", error);
    throw error;
  }
}
