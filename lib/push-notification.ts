/**
 * 푸시 알림 서비스
 * Firebase Cloud Messaging (FCM)을 사용한 실시간 푸시 알림
 */

import { getMessaging } from './firebase-admin'
import { db } from './db'
import { logger } from './logging'

/**
 * 푸시 알림 타입
 */
export enum NotificationType {
  LIKE = 'like',
  MATCH = 'match',
  MESSAGE = 'message',
  MESSAGE_REPLY = 'message_reply',
  PROFILE_VIEW = 'profile_view',
  SYSTEM = 'system',
  PROMOTION = 'promotion',
}

/**
 * 푸시 알림 페이로드
 */
export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  sound?: string
  clickAction?: string
  data?: Record<string, string>
  ttl?: number // 시간 (기본값: 24시간)
}

/**
 * 단일 사용자에게 푸시 알림 전송
 */
export async function sendPushNotification(
  userId: string,
  type: NotificationType,
  payload: PushNotificationPayload
): Promise<string | null> {
  try {
    // 사용자의 디바이스 토큰 조회
    const deviceTokens = await db.pushToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: { token: true },
    })

    if (deviceTokens.length === 0) {
      logger.warn('사용자의 활성 디바이스 토큰이 없습니다', { userId })
      return null
    }

    const messaging = getMessaging()
    const tokens = deviceTokens.map((dt) => dt.token)

    // 알림 메시지 생성
    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.icon,
      },
      data: {
        type,
        ...payload.data,
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: 'high',
        notification: {
          sound: payload.sound || 'default',
          clickAction: payload.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
          icon: payload.badge,
        },
        ttl: (payload.ttl || 24) * 3600,
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: payload.sound || 'default',
            badge: 1,
            'content-available': 1,
          },
        },
      },
    }

    // 다중 기기로 전송
    const response = await messaging.sendMulticast({
      tokens,
      notification: message.notification,
      data: message.data as Record<string, string>,
      android: message.android,
      apns: message.apns,
    })

    logger.info('푸시 알림 전송', {
      userId,
      type,
      successCount: response.successCount,
      failureCount: response.failureCount,
      deviceCount: tokens.length,
    })

    // 실패한 토큰 처리
    if (response.failureCount > 0) {
      const failedTokens: string[] = []

      response.responses.forEach((resp, index) => {
        if (!resp.success) {
          failedTokens.push(tokens[index])
          const error = resp.error

          // 토큰이 더 이상 유효하지 않으면 삭제
          if (
            error?.code === 'messaging/invalid-registration-token' ||
            error?.code === 'messaging/registration-token-not-registered'
          ) {
            db.pushToken
              .updateMany({
                where: { token: tokens[index] },
                data: { isActive: false },
              })
              .catch((e) => {
                logger.error('토큰 비활성화 실패', {
                  token: tokens[index],
                  error: e.message,
                })
              })
          }
        }
      })

      if (failedTokens.length > 0) {
        logger.warn('일부 푸시 알림 전송 실패', {
          userId,
          failedTokens,
        })
      }
    }

    // 데이터베이스에 기록
    await db.notification.create({
      data: {
        userId,
        type: type as string,
        title: payload.title,
        body: payload.body,
        data: payload.data ? JSON.stringify(payload.data) : null,
        sentAt: new Date(),
      },
    })

    return response.successCount > 0 ? 'success' : 'partial_failure'
  } catch (error) {
    logger.error('푸시 알림 전송 실패', {
      userId,
      type,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

/**
 * 여러 사용자에게 푸시 알림 전송
 */
export async function sendPushNotificationToMultiple(
  userIds: string[],
  type: NotificationType,
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const userId of userIds) {
    const result = await sendPushNotification(userId, type, payload)
    if (result) {
      success++
    } else {
      failed++
    }
  }

  logger.info('다중 사용자 푸시 알림 전송 완료', {
    total: userIds.length,
    success,
    failed,
  })

  return { success, failed }
}

/**
 * 특정 조건의 사용자에게 푸시 알림 전송
 */
export async function sendPushNotificationToSegment(
  condition: Record<string, any>,
  type: NotificationType,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  try {
    // 조건에 맞는 사용자 조회
    const users = await db.user.findMany({
      where: condition,
      select: { id: true },
    })

    const userIds = users.map((u) => u.id)

    const result = await sendPushNotificationToMultiple(userIds, type, payload)

    logger.info('세그먼트 푸시 알림 전송 완료', {
      condition,
      type,
      ...result,
    })

    return { sent: result.success, failed: result.failed }
  } catch (error) {
    logger.error('세그먼트 푸시 알림 전송 실패', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return { sent: 0, failed: 0 }
  }
}

/**
 * 좋아요 알림 전송
 */
export async function sendLikeNotification(
  toUserId: string,
  fromUserName: string,
  fromUserId: string
): Promise<string | null> {
  return sendPushNotification(toUserId, NotificationType.LIKE, {
    title: '새로운 좋아요!',
    body: `${fromUserName}님이 당신을 좋아합니다`,
    icon: 'ic_heart',
    sound: 'default',
    data: {
      action: 'open_profile',
      userId: fromUserId,
    },
  })
}

/**
 * 매칭 알림 전송
 */
export async function sendMatchNotification(
  toUserId: string,
  matchUserName: string,
  matchUserId: string
): Promise<string | null> {
  return sendPushNotification(toUserId, NotificationType.MATCH, {
    title: '새로운 매칭!',
    body: `${matchUserName}님과 매칭되었습니다! 메시지를 보내보세요.`,
    icon: 'ic_match',
    sound: 'notification',
    data: {
      action: 'open_chat',
      userId: matchUserId,
    },
  })
}

/**
 * 메시지 알림 전송
 */
export async function sendMessageNotification(
  toUserId: string,
  fromUserName: string,
  fromUserId: string,
  messagePreview: string
): Promise<string | null> {
  return sendPushNotification(toUserId, NotificationType.MESSAGE, {
    title: `${fromUserName}님의 메시지`,
    body: messagePreview.substring(0, 50),
    icon: 'ic_message',
    sound: 'notification',
    data: {
      action: 'open_chat',
      userId: fromUserId,
      messagePreview,
    },
  })
}

/**
 * 프로필 방문 알림 전송
 */
export async function sendProfileViewNotification(
  toUserId: string,
  viewerName: string,
  viewerId: string
): Promise<string | null> {
  return sendPushNotification(toUserId, NotificationType.PROFILE_VIEW, {
    title: '프로필 방문',
    body: `${viewerName}님이 당신의 프로필을 방문했습니다`,
    icon: 'ic_profile',
    data: {
      action: 'open_profile',
      userId: viewerId,
    },
  })
}

/**
 * 시스템 알림 전송
 */
export async function sendSystemNotification(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: number; failed: number }> {
  return sendPushNotificationToMultiple(userIds, NotificationType.SYSTEM, {
    title,
    body,
    icon: 'ic_system',
    data,
  })
}

/**
 * 홍보 알림 전송 (opt-in 필요)
 */
export async function sendPromotionalNotification(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: number; failed: number }> {
  // 홍보 알림을 수신하기로 동의한 사용자만 선택
  const eligibleUsers = await db.user.findMany({
    where: {
      id: { in: userIds },
      notificationsEnabled: true,
    },
    select: { id: true },
  })

  const eligibleUserIds = eligibleUsers.map((u) => u.id)

  return sendPushNotificationToMultiple(
    eligibleUserIds,
    NotificationType.PROMOTION,
    {
      title,
      body,
      icon: 'ic_promotion',
      data,
    }
  )
}
