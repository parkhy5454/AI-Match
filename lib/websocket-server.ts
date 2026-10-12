/**
 * Socket.io WebSocket 서버
 * 실시간 메시징, 채팅, 통화 관리
 */

import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { db } from './db'
import { logger } from './logging'
import { verifyJWT } from './auth'

interface AuthenticatedSocket extends Socket {
  userId?: string
  username?: string
}

interface MessageData {
  recipientId: string
  content: string
}

interface TypingData {
  recipientId: string
}

interface RoomData {
  recipientId: string
}

let io: SocketIOServer | null = null

/**
 * WebSocket 서버 초기화
 */
export function initializeWebSocket(httpServer: HttpServer): SocketIOServer {
  if (io) {
    return io
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    maxHttpBufferSize: 1024 * 1024, // 1MB
  })

  // 인증 미들웨어
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error('인증 토큰이 필요합니다'))
      }

      const decoded = verifyJWT(token)
      if (!decoded || !decoded.sub) {
        return next(new Error('유효하지 않은 토큰입니다'))
      }

      socket.userId = decoded.sub
      const user = await db.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, username: true },
      })

      if (!user) {
        return next(new Error('사용자를 찾을 수 없습니다'))
      }

      socket.username = user.username
      next()
    } catch (error) {
      logger.error('WebSocket 인증 오류', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      next(new Error('인증 오류'))
    }
  })

  // 연결 이벤트
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info('사용자 연결', {
      userId: socket.userId,
      socketId: socket.id,
    })

    // 사용자 온라인 상태 업데이트
    socket.emit('connection:success', {
      userId: socket.userId,
      username: socket.username,
    })

    // 메시지 이벤트 핸들러
    socket.on('message:send', (data: MessageData) =>
      handleMessageSend(socket, data)
    )
    socket.on('message:read', (data: { messageIds: string[] }) =>
      handleMessageRead(socket, data)
    )

    // 타이핑 표시 이벤트
    socket.on('message:typing', (data: TypingData) =>
      handleTypingStart(socket, data)
    )
    socket.on('message:stopped-typing', (data: TypingData) =>
      handleTypingStopped(socket, data)
    )

    // 채팅방 이벤트
    socket.on('room:join', (data: RoomData) => handleRoomJoin(socket, data))
    socket.on('room:leave', (data: RoomData) => handleRoomLeave(socket, data))

    // 상태 확인 이벤트
    socket.on('status:check', (data: { userIds: string[] }) =>
      handleStatusCheck(socket, data)
    )
    socket.on('presence:update', (data: { status: string }) =>
      handlePresenceUpdate(socket, data)
    )

    // 연결 해제 이벤트
    socket.on('disconnect', () => {
      logger.info('사용자 연결 해제', {
        userId: socket.userId,
        socketId: socket.id,
      })
    })

    // 에러 핸들러
    socket.on('error', (error: any) => {
      logger.error('Socket 에러', {
        userId: socket.userId,
        error: error?.message || error,
      })
    })
  })

  logger.info('WebSocket 서버 초기화 완료')
  return io
}

/**
 * WebSocket 서버 인스턴스 반환
 */
export function getWebSocket(): SocketIOServer {
  if (!io) {
    throw new Error('WebSocket 서버가 초기화되지 않았습니다')
  }
  return io
}

/**
 * 메시지 전송 핸들러
 */
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

    // 수신자에게 메시지 전달
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

/**
 * 메시지 읽음 표시 핸들러
 */
async function handleMessageRead(
  socket: AuthenticatedSocket,
  data: { messageIds: string[] }
): Promise<void> {
  try {
    if (!socket.userId || !data.messageIds || data.messageIds.length === 0) {
      return
    }

    // 메시지를 읽음 상태로 업데이트
    await db.message.updateMany({
      where: {
        id: { in: data.messageIds },
        recipientId: socket.userId,
      },
      data: { isRead: true },
    })

    // 발신자들에게 읽음 상태 전달
    for (const messageId of data.messageIds) {
      const message = await db.message.findUnique({
        where: { id: messageId },
        select: { senderId: true },
      })

      if (message) {
        io?.to(message.senderId).emit('message:read:notification', {
          messageIds: data.messageIds,
          readBy: socket.userId,
          readAt: new Date(),
        })
      }
    }

    logger.info('메시지 읽음 표시', {
      userId: socket.userId,
      count: data.messageIds.length,
    })
  } catch (error) {
    logger.error('메시지 읽음 처리 오류', {
      userId: socket.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 타이핑 시작 핸들러
 */
async function handleTypingStart(
  socket: AuthenticatedSocket,
  data: TypingData
): Promise<void> {
  try {
    if (!socket.userId || !data.recipientId) {
      return
    }

    // 상대방에게 타이핑 표시 전달
    io?.to(data.recipientId).emit('message:typing', {
      userId: socket.userId,
      username: socket.username,
    })

    logger.info('타이핑 시작', {
      userId: socket.userId,
      targetUserId: data.recipientId,
    })
  } catch (error) {
    logger.error('타이핑 시작 오류', {
      userId: socket.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 타이핑 중지 핸들러
 */
async function handleTypingStopped(
  socket: AuthenticatedSocket,
  data: TypingData
): Promise<void> {
  try {
    if (!socket.userId || !data.recipientId) {
      return
    }

    // 상대방에게 타이핑 중지 전달
    io?.to(data.recipientId).emit('message:stopped-typing', {
      userId: socket.userId,
    })

    logger.info('타이핑 중지', {
      userId: socket.userId,
      targetUserId: data.recipientId,
    })
  } catch (error) {
    logger.error('타이핑 중지 오류', {
      userId: socket.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 채팅방 입장 핸들러
 */
async function handleRoomJoin(
  socket: AuthenticatedSocket,
  data: RoomData
): Promise<void> {
  try {
    if (!socket.userId || !data.recipientId) {
      return
    }

    // 1:1 대화 방 이름 (항상 같은 방에 들어가도록)
    const roomId = [socket.userId, data.recipientId].sort().join(':')

    socket.join(roomId)

    logger.info('사용자가 채팅방에 입장', {
      userId: socket.userId,
      roomId,
    })

    // 상대방에게 입장 알림
    io?.to(data.recipientId).emit('user:joined', {
      userId: socket.userId,
      username: socket.username,
    })
  } catch (error) {
    logger.error('채팅방 입장 오류', {
      userId: socket.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 채팅방 퇴장 핸들러
 */
async function handleRoomLeave(
  socket: AuthenticatedSocket,
  data: RoomData
): Promise<void> {
  try {
    if (!socket.userId || !data.recipientId) {
      return
    }

    const roomId = [socket.userId, data.recipientId].sort().join(':')

    socket.leave(roomId)

    logger.info('사용자가 채팅방에서 퇴장', {
      userId: socket.userId,
      roomId,
    })

    // 상대방에게 퇴장 알림
    io?.to(data.recipientId).emit('user:left', {
      userId: socket.userId,
    })
  } catch (error) {
    logger.error('채팅방 퇴장 오류', {
      userId: socket.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 상태 확인 핸들러
 */
async function handleStatusCheck(
  socket: AuthenticatedSocket,
  data: { userIds: string[] }
): Promise<void> {
  try {
    if (!socket.userId || !data.userIds) {
      return
    }

    const statuses = data.userIds.map((userId) => ({
      userId,
      isOnline: io?.sockets.sockets.has(userId) ?? false,
    }))

    socket.emit('status:update', { statuses })

    logger.info('상태 확인', {
      userId: socket.userId,
      checkedCount: data.userIds.length,
    })
  } catch (error) {
    logger.error('상태 확인 오류', {
      userId: socket.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 현재 상태 업데이트 핸들러
 */
async function handlePresenceUpdate(
  socket: AuthenticatedSocket,
  data: { status: string }
): Promise<void> {
  try {
    if (!socket.userId || !data.status) {
      return
    }

    const validStatuses = ['online', 'away', 'busy', 'offline']
    if (!validStatuses.includes(data.status)) {
      socket.emit('error', { message: '유효하지 않은 상태입니다' })
      return
    }

    // 모든 사용자에게 상태 업데이트 브로드캐스트
    io?.emit('presence:updated', {
      userId: socket.userId,
      status: data.status,
      updatedAt: new Date(),
    })

    logger.info('상태 업데이트', {
      userId: socket.userId,
      status: data.status,
    })
  } catch (error) {
    logger.error('상태 업데이트 오류', {
      userId: socket.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 특정 사용자에게 메시지 전송 (서버 사이드)
 */
export async function sendMessageToUser(
  recipientId: string,
  eventName: string,
  data: any
): Promise<void> {
  if (!io) {
    throw new Error('WebSocket 서버가 초기화되지 않았습니다')
  }

  io.to(recipientId).emit(eventName, data)
}

/**
 * 모든 사용자에게 메시지 브로드캐스트 (서버 사이드)
 */
export async function broadcastMessage(
  eventName: string,
  data: any
): Promise<void> {
  if (!io) {
    throw new Error('WebSocket 서버가 초기화되지 않았습니다')
  }

  io.emit(eventName, data)
}
