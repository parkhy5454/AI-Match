// Standalone WebSocket Server for Real-time Messaging
// Run this alongside the Next.js server on a different port

const { Server } = require('socket.io');
const { createServer } = require('http');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const PORT = process.env.WEBSOCKET_PORT || 3001;
const ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-12345';
const USE_REDIS = process.env.REDIS_URL ? true : false;
const NODE_ENV = process.env.NODE_ENV || 'development';

const prisma = new PrismaClient();

// Rate limiter 설정
class RateLimiter {
  constructor() {
    this.limiters = new Map();
    this.config = new Map();
  }

  setLimit(eventName, config) {
    this.config.set(eventName, config);
  }

  check(userId, eventName) {
    const config = this.config.get(eventName);
    if (!config) return { allowed: true, remaining: -1, resetTime: 0 };

    const now = Date.now();
    if (!this.limiters.has(userId)) {
      this.limiters.set(userId, new Map());
    }

    const userLimiters = this.limiters.get(userId);
    let entry = userLimiters.get(eventName);

    if (!entry || now >= entry.resetTime) {
      entry = { count: 0, resetTime: now + config.windowMs };
      userLimiters.set(eventName, entry);
    }

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const allowed = entry.count < config.maxRequests;

    if (allowed) {
      entry.count++;
    }

    return { allowed, remaining, resetTime: entry.resetTime };
  }

  cleanup() {
    const now = Date.now();
    this.limiters.forEach((userLimiters, userId) => {
      let hasEntries = false;
      userLimiters.forEach((entry, eventName) => {
        if (entry.resetTime > now) {
          hasEntries = true;
        } else {
          userLimiters.delete(eventName);
        }
      });
      if (!hasEntries) {
        this.limiters.delete(userId);
      }
    });
  }
}

const rateLimiter = new RateLimiter();

// 환경에 따른 레이트 리미터 설정
const rateLimitConfig = NODE_ENV === 'production' ?
  {
    'message:send': { maxRequests: 5, windowMs: 1000 },
    'chat:message': { maxRequests: 5, windowMs: 1000 },
    'message:read': { maxRequests: 10, windowMs: 1000 },
    'typing:start': { maxRequests: 20, windowMs: 1000 },
    'typing:stop': { maxRequests: 20, windowMs: 1000 },
    'chat:join': { maxRequests: 3, windowMs: 1000 },
    'chat:leave': { maxRequests: 3, windowMs: 1000 },
    'call:initiate': { maxRequests: 2, windowMs: 5000 },
    'call:answer': { maxRequests: 2, windowMs: 5000 },
    'call:decline': { maxRequests: 2, windowMs: 5000 },
    'call:end': { maxRequests: 2, windowMs: 5000 },
    'webrtc:offer': { maxRequests: 3, windowMs: 1000 },
    'webrtc:answer': { maxRequests: 3, windowMs: 1000 },
    'webrtc:ice-candidate': { maxRequests: 50, windowMs: 1000 },
    'presence:update': { maxRequests: 1, windowMs: 1000 },
    'ping': { maxRequests: 60, windowMs: 1000 },
  } :
  {
    'message:send': { maxRequests: 10, windowMs: 1000 },
    'chat:message': { maxRequests: 10, windowMs: 1000 },
    'message:read': { maxRequests: 20, windowMs: 1000 },
    'typing:start': { maxRequests: 30, windowMs: 1000 },
    'typing:stop': { maxRequests: 30, windowMs: 1000 },
    'chat:join': { maxRequests: 5, windowMs: 1000 },
    'chat:leave': { maxRequests: 5, windowMs: 1000 },
    'call:initiate': { maxRequests: 3, windowMs: 5000 },
    'call:answer': { maxRequests: 3, windowMs: 5000 },
    'call:decline': { maxRequests: 3, windowMs: 5000 },
    'call:end': { maxRequests: 3, windowMs: 5000 },
    'webrtc:offer': { maxRequests: 5, windowMs: 1000 },
    'webrtc:answer': { maxRequests: 5, windowMs: 1000 },
    'webrtc:ice-candidate': { maxRequests: 100, windowMs: 1000 },
    'presence:update': { maxRequests: 2, windowMs: 1000 },
    'ping': { maxRequests: 60, windowMs: 1000 },
  };

// 레이트 리미터 설정 적용
Object.entries(rateLimitConfig).forEach(([event, config]) => {
  rateLimiter.setLimit(event, config);
});

// Redis Adapter (선택사항)
let redisClient = null;
let redisAdapter = null;

if (USE_REDIS) {
  try {
    const redis = require('redis');
    const { createAdapter } = require('@socket.io/redis-adapter');

    const pubClient = redis.createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
      redisClient = pubClient;
      redisAdapter = createAdapter(pubClient, subClient);
      console.log('[Redis] Redis Adapter 연결됨:', process.env.REDIS_URL);
    }).catch((err) => {
      console.error('[Redis] Redis 연결 실패:', err.message);
      console.warn('[Redis] 싱글 인스턴스 모드로 실행합니다');
    });
  } catch (err) {
    console.warn('[Redis] Redis 패키지가 설치되지 않았습니다');
    console.warn('프로덕션 배포 시 Redis 어댑터를 사용하려면:');
    console.warn('npm install redis @socket.io/redis-adapter');
  }
}

// Create HTTP server
const httpServer = createServer();

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: ORIGIN,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
});

// Redis Adapter 설정
if (redisAdapter) {
  io.adapter(redisAdapter);
  console.log('[Socket.io] Redis Adapter 활성화됨 - 여러 인스턴스 지원');
}

// Online users tracking
const onlineUsers = new Map();

// Authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('인증 토큰이 필요합니다'));
    }

    // JWT 토큰 검증
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.userId) {
      return next(new Error('유효하지 않은 토큰입니다'));
    }

    socket.userId = decoded.userId;
    socket.userEmail = decoded.email;
    next();
  } catch (error) {
    console.error('[WebSocket] 인증 오류:', error.message);
    next(new Error('인증 실패: ' + error.message));
  }
});

// ============ HELPER FUNCTIONS ============

/**
 * 사용자의 온라인 상태를 업데이트
 */
async function updateOnlineStatus(userId, isOnline, socketId = null) {
  try {
    await prisma.onlineStatus.upsert({
      where: { userId },
      update: {
        isOnline,
        lastSeen: new Date(),
        socketId: isOnline ? socketId : null,
      },
      create: {
        userId,
        isOnline,
        socketId: isOnline ? socketId : null,
      },
    });
  } catch (error) {
    console.error('[OnlineStatus] Update failed:', error.message);
  }
}

/**
 * 대기 중인 메시지들을 사용자에게 전달
 */
async function deliverQueuedMessages(userId, socket) {
  try {
    // 1:1 메시지 조회
    const queuedMessages = await prisma.undeliveredMessage.findMany({
      where: {
        recipientId: userId,
        isDelivered: false,
      },
      orderBy: { queuedAt: 'asc' },
      take: 100, // 한번에 최대 100개
    });

    if (queuedMessages.length > 0) {
      console.log(`[UndeliveredQueue] Delivering ${queuedMessages.length} messages to ${userId}`);

      for (const queuedMsg of queuedMessages) {
        socket.emit('message:receive', {
          id: queuedMsg.messageId,
          senderId: queuedMsg.senderId,
          recipientId: queuedMsg.recipientId,
          content: queuedMsg.content,
          createdAt: queuedMsg.queuedAt,
          isRead: false,
          isMine: false,
          wasQueued: true, // 클라이언트에서 구분할 수 있도록
        });

        // 배달됨으로 표시
        await prisma.undeliveredMessage.update({
          where: { id: queuedMsg.id },
          data: {
            isDelivered: true,
            deliveredAt: new Date(),
          },
        });
      }
    }

    // 그룹 메시지 조회
    const queuedGroupMessages = await prisma.undeliveredGroupMessage.findMany({
      where: {
        userId: userId,
        isDelivered: false,
      },
      orderBy: { queuedAt: 'asc' },
      take: 100,
    });

    if (queuedGroupMessages.length > 0) {
      console.log(`[UndeliveredQueue] Delivering ${queuedGroupMessages.length} group messages to ${userId}`);

      for (const queuedMsg of queuedGroupMessages) {
        socket.emit('chat:message', {
          id: queuedMsg.groupMessageId,
          roomId: queuedMsg.roomId,
          senderId: queuedMsg.groupMessageId.substring(0, 10), // 실제로는 senderInfo를 저장해야 함
          content: queuedMsg.content,
          createdAt: queuedMsg.queuedAt,
          isRead: false,
          wasQueued: true,
        });

        // 배달됨으로 표시
        await prisma.undeliveredGroupMessage.update({
          where: { id: queuedMsg.id },
          data: {
            isDelivered: true,
            deliveredAt: new Date(),
          },
        });
      }
    }
  } catch (error) {
    console.error('[UndeliveredQueue] Delivery error:', error.message);
  }
}

// Connection handler
io.on('connection', (socket) => {
  const userId = socket.userId;

  if (!userId) {
    socket.disconnect();
    return;
  }

  console.log(`[WebSocket] User connected: ${userId} (${socket.id})`);

  // Track online users
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);

  // 온라인 상태 업데이트
  updateOnlineStatus(userId, true, socket.id);

  // 대기 중인 메시지 전달
  deliverQueuedMessages(userId, socket);

  // Broadcast user online
  io.emit('user:online', {
    userId,
    onlineCount: onlineUsers.size,
  });

  // ============ MESSAGE EVENTS ============

  /**
   * message:send - Send 1:1 message
   */
  socket.on('message:send', async (data) => {
    try {
      // Rate limiting 체크
      const rateLimit = rateLimiter.check(userId, 'message:send');
      if (!rateLimit.allowed) {
        socket.emit('error', {
          message: 'Rate limit exceeded. Please slow down.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        });
        console.warn(`[RateLimit] User ${userId} exceeded message:send limit`);
        return;
      }

      const { recipientId, content } = data;

      if (!content || content.trim().length === 0) {
        socket.emit('error', { message: 'Message content is required' });
        return;
      }

      if (content.length > 1000) {
        socket.emit('error', { message: 'Message exceeds 1000 characters' });
        return;
      }

      // 데이터베이스에 메시지 저장
      const savedMessage = await prisma.message.create({
        data: {
          senderId: userId,
          recipientId: recipientId,
          content: content.trim(),
        },
        select: {
          id: true,
          senderId: true,
          recipientId: true,
          content: true,
          createdAt: true,
          isRead: true,
        },
      });

      const messageData = {
        id: savedMessage.id,
        senderId: savedMessage.senderId,
        recipientId: savedMessage.recipientId,
        content: savedMessage.content,
        createdAt: savedMessage.createdAt,
        isRead: savedMessage.isRead,
        isMine: true,
      };

      // 수신자가 온라인인 경우 실시간으로 전송
      const recipientSockets = onlineUsers.get(recipientId);
      if (recipientSockets && recipientSockets.size > 0) {
        recipientSockets.forEach((socketId) => {
          io.to(socketId).emit('message:receive', {
            ...messageData,
            isMine: false,
          });
        });

        console.log(`[WebSocket] Message delivered in real-time: ${userId} → ${recipientId} (ID: ${savedMessage.id})`);
      } else {
        // 수신자가 오프라인인 경우 미배달 메시지로 큐에 저장
        try {
          await prisma.undeliveredMessage.create({
            data: {
              senderId: userId,
              recipientId: recipientId,
              messageId: savedMessage.id,
              content: savedMessage.content,
            },
          });

          console.log(`[UndeliveredQueue] Message queued for offline user: ${userId} → ${recipientId} (ID: ${savedMessage.id})`);
        } catch (queueError) {
          console.error('[UndeliveredQueue] Failed to queue message:', queueError.message);
        }
      }

      // 발신자에게 확인 메시지 전송
      socket.emit('message:sent', {
        ...messageData,
        queued: recipientSockets ? false : true, // 오프라인 사용자에게는 queued=true
      });

      console.log(`[WebSocket] Message saved: ${userId} → ${recipientId} (ID: ${savedMessage.id})`);
    } catch (error) {
      console.error('[WebSocket] Message send error:', error);
      socket.emit('error', { message: 'Failed to send message', details: error.message });
    }
  });

  /**
   * typing:start - Notify user is typing
   * 1:1 메시징 또는 그룹 채팅에서 입력 시작
   */
  socket.on('typing:start', async (data) => {
    // Rate limiting
    const rateLimit = rateLimiter.check(userId, 'typing:start');
    if (!rateLimit.allowed) {
      return; // 타이핑 이벤트는 실패 응답 안함
    }

    try {
      const { recipientId, roomId } = data;

      // 사용자 정보 조회 (username 포함)
      let username = userId;
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });
        if (user?.username) {
          username = user.username;
        }
      } catch (err) {
        // 사용자 정보 조회 실패 시 userID 사용
      }

      // 1:1 메시징
      if (recipientId) {
        const recipientSockets = onlineUsers.get(recipientId);
        if (recipientSockets) {
          recipientSockets.forEach((socketId) => {
            io.to(socketId).emit('typing:start', {
              userId,
              username,
              recipientId,
            });
          });
        }
        console.log(`[WebSocket] ${username} started typing (to ${recipientId})`);
      }

      // 그룹 채팅
      else if (roomId) {
        io.to(`room:${roomId}`).emit('typing:start', {
          userId,
          username,
          roomId,
        });
        console.log(`[WebSocket] ${username} started typing (in ${roomId})`);
      }
    } catch (error) {
      console.error('[WebSocket] typing:start error:', error);
    }
  });

  /**
   * typing:stop - Notify user stopped typing
   * 입력 중지
   */
  socket.on('typing:stop', async (data) => {
    // Rate limiting
    const rateLimit = rateLimiter.check(userId, 'typing:stop');
    if (!rateLimit.allowed) {
      return;
    }

    try {
      const { recipientId, roomId } = data;

      // 1:1 메시징
      if (recipientId) {
        const recipientSockets = onlineUsers.get(recipientId);
        if (recipientSockets) {
          recipientSockets.forEach((socketId) => {
            io.to(socketId).emit('typing:stop', {
              userId,
              recipientId,
            });
          });
        }
        console.log(`[WebSocket] ${userId} stopped typing (to ${recipientId})`);
      }

      // 그룹 채팅
      else if (roomId) {
        io.to(`room:${roomId}`).emit('typing:stop', {
          userId,
          roomId,
        });
        console.log(`[WebSocket] ${userId} stopped typing (in ${roomId})`);
      }
    } catch (error) {
      console.error('[WebSocket] typing:stop error:', error);
    }
  });

  /**
   * message:read - Mark message as read
   */
  socket.on('message:read', async (data) => {
    try {
      // Rate limiting
      const rateLimit = rateLimiter.check(userId, 'message:read');
      if (!rateLimit.allowed) {
        // 읽음 표시는 실패해도 사일런트 무시
        return;
      }

      const { messageId, senderId } = data;

      // 데이터베이스에서 메시지를 읽음으로 표시
      await prisma.message.update({
        where: { id: messageId },
        data: { isRead: true },
      });

      const senderSockets = onlineUsers.get(senderId);
      if (senderSockets) {
        senderSockets.forEach((socketId) => {
          io.to(socketId).emit('message:read', {
            messageId,
            readBy: userId,
            readAt: new Date(),
          });
        });
      }

      console.log(`[WebSocket] Message read: ${messageId} by ${userId}`);
    } catch (error) {
      console.error('[WebSocket] Message read error:', error);
    }
  });

  // ============ CHAT ROOM EVENTS ============

  /**
   * chat:join - Join chat room
   */
  socket.on('chat:join', (data) => {
    // Rate limiting
    const rateLimit = rateLimiter.check(userId, 'chat:join');
    if (!rateLimit.allowed) {
      socket.emit('error', {
        message: 'Rate limit exceeded for joining rooms',
        code: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }

    const { roomId } = data;
    socket.join(`room:${roomId}`);

    io.to(`room:${roomId}`).emit('user:joined', {
      userId,
      roomId,
      timestamp: new Date(),
    });

    console.log(`[WebSocket] User ${userId} joined room ${roomId}`);
  });

  /**
   * chat:leave - Leave chat room
   */
  socket.on('chat:leave', (data) => {
    // Rate limiting
    const rateLimit = rateLimiter.check(userId, 'chat:leave');
    if (!rateLimit.allowed) {
      socket.emit('error', {
        message: 'Rate limit exceeded for leaving rooms',
        code: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }

    const { roomId } = data;
    socket.leave(`room:${roomId}`);

    io.to(`room:${roomId}`).emit('user:left', {
      userId,
      roomId,
      timestamp: new Date(),
    });

    console.log(`[WebSocket] User ${userId} left room ${roomId}`);
  });

  /**
   * chat:message - Send chat room message
   */
  socket.on('chat:message', async (data) => {
    try {
      // Rate limiting
      const rateLimit = rateLimiter.check(userId, 'chat:message');
      if (!rateLimit.allowed) {
        socket.emit('error', {
          message: 'Rate limit exceeded. Please slow down.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        });
        console.warn(`[RateLimit] User ${userId} exceeded chat:message limit`);
        return;
      }

      const { roomId, content } = data;

      if (!content || content.trim().length === 0) {
        socket.emit('error', { message: 'Message content is required' });
        return;
      }

      if (content.length > 1000) {
        socket.emit('error', { message: 'Message exceeds 1000 characters' });
        return;
      }

      // 데이터베이스에 그룹 메시지 저장
      const savedMessage = await prisma.groupMessage.create({
        data: {
          roomId,
          senderId: userId,
          content: content.trim(),
        },
        select: {
          id: true,
          roomId: true,
          senderId: true,
          content: true,
          createdAt: true,
          isRead: true,
        },
      });

      const messageData = {
        id: savedMessage.id,
        roomId: savedMessage.roomId,
        senderId: savedMessage.senderId,
        content: savedMessage.content,
        createdAt: savedMessage.createdAt,
        isRead: savedMessage.isRead,
      };

      // 채팅방의 모든 멤버를 조회하여 온라인 상태 확인
      const roomMembers = await prisma.chatRoomMember.findMany({
        where: {
          roomId,
          leftAt: null, // 아직 방을 나가지 않은 멤버만
        },
        select: { userId: true },
      });

      // 메시지를 모든 온라인 멤버에게 전송
      for (const member of roomMembers) {
        if (member.userId === userId) continue; // 발신자 제외

        const memberSockets = onlineUsers.get(member.userId);
        if (memberSockets && memberSockets.size > 0) {
          // 온라인 멤버에게 전송
          memberSockets.forEach((socketId) => {
            io.to(socketId).emit('chat:message', messageData);
          });
        } else {
          // 오프라인 멤버를 위해 미배달 메시지로 저장
          try {
            await prisma.undeliveredGroupMessage.create({
              data: {
                roomId,
                userId: member.userId,
                groupMessageId: savedMessage.id,
                content: savedMessage.content,
                senderName: userId, // 실제로는 사용자 이름을 조회해야 함
              },
            });

            console.log(`[UndeliveredQueue] Group message queued for offline user ${member.userId}`);
          } catch (queueError) {
            console.error('[UndeliveredQueue] Failed to queue group message:', queueError.message);
          }
        }
      }

      // 발신자에게도 확인 메시지
      socket.emit('chat:message', messageData);

      console.log(`[WebSocket] Room ${roomId}: ${userId} sent message (ID: ${savedMessage.id})`);
    } catch (error) {
      console.error('[WebSocket] Chat message error:', error);
      socket.emit('error', { message: 'Failed to send message', details: error.message });
    }
  });

  // ============ CALL EVENTS ============

  /**
   * call:initiate - Initiate a call
   */
  socket.on('call:initiate', async (data) => {
    try {
      // Rate limiting
      const rateLimit = rateLimiter.check(userId, 'call:initiate');
      if (!rateLimit.allowed) {
        socket.emit('error', {
          message: 'Too many call attempts. Please wait.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        });
        return;
      }

      const { recipientId, callType, callId } = data;

      // 데이터베이스에 통화 세션 생성 (선택사항 - API와 중복될 수 있음)
      const recipientSockets = onlineUsers.get(recipientId);
      if (recipientSockets) {
        recipientSockets.forEach((socketId) => {
          io.to(socketId).emit('call:incoming', {
            callerId: userId,
            callType, // 'audio' or 'video'
            callId: callId || socket.id,
            timestamp: new Date(),
          });
        });
      } else {
        // 수신자가 오프라인이면 발신자에게 알림
        socket.emit('call:failed', {
          reason: 'recipient_offline',
          message: '상대방이 현재 온라인 상태가 아닙니다',
        });
      }

      console.log(`[WebSocket] Call initiated: ${userId} → ${recipientId} (${callType})`);
    } catch (error) {
      console.error('[WebSocket] Call initiate error:', error);
      socket.emit('error', { message: 'Failed to initiate call' });
    }
  });

  /**
   * call:answer - Answer incoming call
   */
  socket.on('call:answer', (data) => {
    const { callerId } = data;

    const callerSockets = onlineUsers.get(callerId);
    if (callerSockets) {
      callerSockets.forEach((socketId) => {
        io.to(socketId).emit('call:answered', {
          answererId: userId,
          timestamp: new Date(),
        });
      });
    }

    console.log(`[WebSocket] Call answered: ${userId} (from ${callerId})`);
  });

  /**
   * call:decline - Decline incoming call
   */
  socket.on('call:decline', (data) => {
    const { callerId } = data;

    const callerSockets = onlineUsers.get(callerId);
    if (callerSockets) {
      callerSockets.forEach((socketId) => {
        io.to(socketId).emit('call:declined', {
          declinesBy: userId,
          timestamp: new Date(),
        });
      });
    }

    console.log(`[WebSocket] Call declined: ${userId}`);
  });

  /**
   * call:end - End active call
   */
  socket.on('call:end', (data) => {
    const { recipientId, duration } = data;

    const recipientSockets = onlineUsers.get(recipientId);
    if (recipientSockets) {
      recipientSockets.forEach((socketId) => {
        io.to(socketId).emit('call:ended', {
          endedBy: userId,
          duration,
          timestamp: new Date(),
        });
      });
    }

    console.log(`[WebSocket] Call ended: ${userId} (duration: ${duration}s)`);
  });

  // ============ WEBRTC SIGNALING ============

  /**
   * webrtc:offer - Send SDP offer for WebRTC connection
   */
  socket.on('webrtc:offer', (data) => {
    try {
      // Rate limiting
      const rateLimit = rateLimiter.check(userId, 'webrtc:offer');
      if (!rateLimit.allowed) {
        socket.emit('error', { message: 'Rate limit exceeded for WebRTC offers' });
        return;
      }

      const { recipientId, offer, callId } = data;

      if (!offer) {
        socket.emit('error', { message: 'Offer is required' });
        return;
      }

      const recipientSockets = onlineUsers.get(recipientId);
      if (recipientSockets) {
        recipientSockets.forEach((socketId) => {
          io.to(socketId).emit('webrtc:offer', {
            callerId: userId,
            offer,
            callId,
          });
        });
      }

      console.log(`[WebSocket] WebRTC offer sent: ${userId} → ${recipientId}`);
    } catch (error) {
      console.error('[WebSocket] WebRTC offer error:', error);
      socket.emit('error', { message: 'Failed to send offer' });
    }
  });

  /**
   * webrtc:answer - Send SDP answer for WebRTC connection
   */
  socket.on('webrtc:answer', (data) => {
    try {
      // Rate limiting
      const rateLimit = rateLimiter.check(userId, 'webrtc:answer');
      if (!rateLimit.allowed) {
        socket.emit('error', { message: 'Rate limit exceeded for WebRTC answers' });
        return;
      }

      const { recipientId, answer, callId } = data;

      if (!answer) {
        socket.emit('error', { message: 'Answer is required' });
        return;
      }

      const recipientSockets = onlineUsers.get(recipientId);
      if (recipientSockets) {
        recipientSockets.forEach((socketId) => {
          io.to(socketId).emit('webrtc:answer', {
            calleeId: userId,
            answer,
            callId,
          });
        });
      }

      console.log(`[WebSocket] WebRTC answer sent: ${userId} → ${recipientId}`);
    } catch (error) {
      console.error('[WebSocket] WebRTC answer error:', error);
      socket.emit('error', { message: 'Failed to send answer' });
    }
  });

  /**
   * webrtc:ice-candidate - Send ICE candidate
   */
  socket.on('webrtc:ice-candidate', (data) => {
    try {
      // Rate limiting (ICE candidates는 매우 높은 빈도)
      const rateLimit = rateLimiter.check(userId, 'webrtc:ice-candidate');
      if (!rateLimit.allowed) {
        // ICE candidate는 실패 응답 없음 (많은 빈도로 전송됨)
        return;
      }

      const { recipientId, candidate, callId } = data;

      if (!candidate) {
        socket.emit('error', { message: 'Candidate is required' });
        return;
      }

      const recipientSockets = onlineUsers.get(recipientId);
      if (recipientSockets) {
        recipientSockets.forEach((socketId) => {
          io.to(socketId).emit('webrtc:ice-candidate', {
            senderId: userId,
            candidate,
            callId,
          });
        });
      }

      console.log(`[WebSocket] ICE candidate sent: ${userId} → ${recipientId}`);
    } catch (error) {
      console.error('[WebSocket] ICE candidate error:', error);
      // Don't send error for ICE candidates as they're sent continuously
    }
  });

  // ============ PRESENCE EVENTS ============

  /**
   * presence:update - Update user presence/status
   */
  socket.on('presence:update', (data) => {
    const { status } = data; // 'online', 'away', 'busy'

    io.emit('presence:updated', {
      userId,
      status,
      timestamp: new Date(),
    });

    console.log(`[WebSocket] Presence: ${userId} is ${status}`);
  });

  // ============ DISCONNECT ============

  socket.on('disconnect', () => {
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        // 마지막 연결이 끊어졌으므로 오프라인으로 표시
        updateOnlineStatus(userId, false, null);
      }
    }

    io.emit('user:offline', {
      userId,
      onlineCount: onlineUsers.size,
    });

    console.log(`[WebSocket] User disconnected: ${userId} (${socket.id})`);
  });
});

// Stats logging with rate limiter cleanup
setInterval(() => {
  console.log(
    `[WebSocket Stats] Active users: ${onlineUsers.size}, Connections: ${io.engine.clientsCount}`
  );

  // 주기적으로 레이트 리미터 정리 (1시간마다)
  rateLimiter.cleanup();
}, 30000);

// Server startup
httpServer.listen(PORT, () => {
  console.log(`🚀 WebSocket Server running on port ${PORT}`);
  console.log(`🔗 CORS origin: ${ORIGIN}`);
  console.log(`📡 Transports: websocket, polling`);
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`[WebSocket] ${signal} received, shutting down gracefully`);

  // Socket.io 서버 종료
  httpServer.close(async () => {
    console.log('[WebSocket] HTTP server closed');

    // Redis 연결 종료
    if (redisClient) {
      await redisClient.disconnect();
      console.log('[Redis] Redis connection closed');
    }

    // Prisma 연결 종료
    await prisma.$disconnect();
    console.log('[WebSocket] Database connection closed');

    process.exit(0);
  });

  // 30초 후 강제 종료
  setTimeout(() => {
    console.error('[WebSocket] Forced shutdown after 30 seconds');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 에러 처리
process.on('uncaughtException', (error) => {
  console.error('[WebSocket] Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[WebSocket] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
