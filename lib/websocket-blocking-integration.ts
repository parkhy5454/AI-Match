/**
 * WebSocket과 차단 시스템 통합
 * Socket.io 메시지 필터링 및 차단 처리
 */

import { Socket } from 'socket.io'
import { canSendMessage, isUserBlocked } from './blocking-system'
import { logger } from './logging'

/**
 * 메시지 전송 전 차단 확인 (메시지 핸들러에서 사용)
 * handleMessageSend에 추가하여 사용
 */
export async function checkBlockingBeforeSendMessage(
  senderId: string,
  recipientId: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const canSend = await canSendMessage(senderId, recipientId)

    if (!canSend) {
      const [senderBlocked, recipientBlocked] = await Promise.all([
        isUserBlocked(senderId, recipientId),
        isUserBlocked(recipientId, senderId),
      ])

      const reason = senderBlocked
        ? '이 사용자는 차단되었습니다'
        : '이 사용자가 당신을 차단했습니다'

      logger.warn('차단된 사용자에게 메시지 시도 차단됨', {
        senderId,
        recipientId,
        senderBlocked,
        recipientBlocked,
      })

      return { allowed: false, reason }
    }

    return { allowed: true }
  } catch (error) {
    logger.error('차단 상태 확인 오류', {
      senderId,
      recipientId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    // 에러 발생 시 안전하게 메시지 차단
    return { allowed: false, reason: '보안 검사 중 오류가 발생했습니다' }
  }
}

/**
 * Socket.io 메시지 핸들러에 차단 검사를 추가합니다
 * 기존 handleMessageSend 함수 시작 부분에 추가:
 *
 * async function handleMessageSend(
 *   socket: AuthenticatedSocket,
 *   data: MessageData
 * ): Promise<void> {
 *   try {
 *     // ... 기존 검증 코드 ...
 *
 *     // 차단 검사 추가
 *     const blockingCheck = await checkBlockingBeforeSendMessage(
 *       socket.userId,
 *       data.recipientId
 *     )
 *
 *     if (!blockingCheck.allowed) {
 *       socket.emit('error', {
 *         message: blockingCheck.reason || '메시지를 보낼 수 없습니다',
 *       })
 *       return
 *     }
 *
 *     // ... 나머지 코드 ...
 *   }
 * }
 */

/**
 * 특정 사용자에게 메시지를 받지 못하도록 설정
 * 이미 연결된 클라이언트는 해당 sender로부터 메시지를 받지 않음
 */
export async function blockUserMessagesForSocket(
  socket: Socket,
  blockedUserIds: string[]
): Promise<void> {
  try {
    // 소켓 데이터에 차단된 사용자 목록 저장
    ;(socket as any).blockedUserIds = new Set(blockedUserIds)

    logger.info('소켓 차단 목록 업데이트됨', {
      socketId: socket.id,
      blockedCount: blockedUserIds.length,
    })
  } catch (error) {
    logger.error('소켓 차단 목록 업데이트 실패', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 메시지 수신 시 차단 확인
 * emit 전에 호출하여 차단된 메시지는 수신하지 않음
 */
export function shouldDeliverMessage(
  socket: Socket,
  senderId: string
): boolean {
  const blockedUserIds = (socket as any).blockedUserIds as Set<string> | undefined

  if (!blockedUserIds) {
    return true
  }

  return !blockedUserIds.has(senderId)
}

/**
 * 새로운 연결 시 차단 목록을 로드하여 초기화
 * socket.io 'connection' 핸들러에서 호출:
 *
 * io.on('connection', async (socket: AuthenticatedSocket) => {
 *   // ... 기존 코드 ...
 *
 *   // 사용자의 차단 목록 로드
 *   const blockedUserIds = await loadBlockedUsersForSocket(socket.userId)
 *   await blockUserMessagesForSocket(socket, Array.from(blockedUserIds))
 *
 *   // ... 나머지 코드 ...
 * })
 */
export async function loadBlockedUsersForSocket(
  userId: string
): Promise<Set<string>> {
  try {
    const { getAccessibleUserIds } = await import('./blocking-system')
    const blockedUsers = await getAccessibleUserIds(userId)

    logger.info('소켓 차단 목록 로드됨', {
      userId,
      blockedCount: blockedUsers.size,
    })

    return blockedUsers
  } catch (error) {
    logger.error('소켓 차단 목록 로드 실패', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return new Set()
  }
}

/**
 * 실시간 차단 이벤트 (옵션)
 * 사용자가 다른 탭에서 차단 작업을 수행했을 때
 * 이를 다른 연결된 소켓에 알림
 *
 * socket.on('blocking:refresh', async (data) => {
 *   const blockedUsers = await loadBlockedUsersForSocket(socket.userId)
 *   await blockUserMessagesForSocket(socket, Array.from(blockedUsers))
 *
 *   socket.emit('blocking:updated', {
 *     message: '차단 목록이 업데이트되었습니다',
 *   })
 * })
 */

/**
 * 수정된 handleMessageSend 예제 (차단 검사 포함)
 * 기존 websocket-server.ts의 handleMessageSend를 수정하려면:
 */
export const messageHandlerWithBlocking = `
async function handleMessageSend(
  socket: AuthenticatedSocket,
  data: MessageData
): Promise<void> {
  try {
    if (!socket.userId || !data.recipientId || !data.content) {
      socket.emit('error', { message: '필수 필드가 누락되었습니다' })
      return
    }

    if (data.content.trim().length === 0) {
      socket.emit('error', { message: '메시지 내용이 비어있습니다' })
      return
    }

    if (data.content.length > 1000) {
      socket.emit('error', { message: '메시지는 1000자 이하여야 합니다' })
      return
    }

    // ★ 차단 검사 추가 ★
    const blockingCheck = await checkBlockingBeforeSendMessage(
      socket.userId,
      data.recipientId
    )

    if (!blockingCheck.allowed) {
      socket.emit('error', {
        message: blockingCheck.reason || '메시지를 보낼 수 없습니다',
      })
      return
    }

    // 메시지 저장
    const message = await db.message.create({
      data: {
        senderId: socket.userId,
        recipientId: data.recipientId,
        content: data.content.trim(),
      },
    })

    logger.info('메시지 전송', {
      messageId: message.id,
      senderId: socket.userId,
      recipientId: data.recipientId,
    })

    // 발신자에게 전송 확인
    socket.emit('message:sent', {
      id: message.id,
      senderId: socket.userId,
      recipientId: data.recipientId,
      content: message.content,
      createdAt: message.createdAt,
    })

    // ★ 수신자가 발신자를 차단하지 않았는지 확인 후 메시지 전달 ★
    io?.to(data.recipientId).emit('message:receive', {
      id: message.id,
      senderId: socket.userId,
      senderName: socket.username,
      recipientId: data.recipientId,
      content: message.content,
      isRead: false,
      createdAt: message.createdAt,
    })
  } catch (error) {
    logger.error('메시지 전송 오류', {
      userId: socket.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    socket.emit('error', { message: '메시지 전송 중 오류가 발생했습니다' })
  }
}
`
