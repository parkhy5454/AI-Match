import { Server as SocketIOServer, Socket } from "socket.io";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import type { NextApiRequest, NextApiResponse } from "next";

// 온라인 사용자 추적
const onlineUsers = new Map<string, Set<string>>();

/**
 * Socket.io 인증 미들웨어
 */
export function setupSocketAuthentication(io: SocketIOServer) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("인증 토큰이 필요합니다"));
      }

      // 토큰 검증
      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error("유효하지 않은 토큰입니다"));
      }

      // socket에 userId 저장
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error("인증 실패"));
    }
  });
}

/**
 * Socket.io 이벤트 핸들러 설정
 */
export function setupSocketHandlers(io: SocketIOServer) {
  io.on("connection", (socket: Socket & { userId?: string }) => {
    const userId = socket.userId;

    if (!userId) {
      socket.disconnect();
      return;
    }

    console.log(`[Socket] 사용자 연결: ${userId} (${socket.id})`);

    // 온라인 사용자 추적
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)?.add(socket.id);

    // 온라인 상태 브로드캐스트
    io.emit("user:online", {
      userId,
      onlineCount: onlineUsers.size,
    });

    // ============ 채팅 메시지 이벤트 ============

    /**
     * message:send - 메시지 전송
     */
    socket.on(
      "message:send",
      async (data: {
        recipientId: string;
        content: string;
      }) => {
        try {
          const { recipientId, content } = data;

          if (!content || content.trim().length === 0) {
            socket.emit("error", { message: "메시지 내용이 비어있습니다" });
            return;
          }

          if (content.length > 1000) {
            socket.emit("error", {
              message: "메시지는 1000자 이내여야 합니다",
            });
            return;
          }

          // DB에 메시지 저장
          const message = await db.message.create({
            data: {
              senderId: userId,
              recipientId,
              content: content.trim(),
            },
          });

          const messageData = {
            id: message.id,
            senderId: message.senderId,
            recipientId: message.recipientId,
            content: message.content,
            isRead: message.isRead,
            createdAt: message.createdAt.toISOString(),
          };

          // 수신자에게 메시지 전송
          const recipientSockets = onlineUsers.get(recipientId);
          if (recipientSockets) {
            recipientSockets.forEach((socketId) => {
              io.to(socketId).emit("message:receive", messageData);
            });
          }

          // 발신자에게 확인
          socket.emit("message:sent", messageData);

          console.log(
            `[Message] ${userId} → ${recipientId}: ${content.substring(0, 50)}`
          );
        } catch (error) {
          console.error("[Message Send Error]:", error);
          socket.emit("error", { message: "메시지 전송에 실패했습니다" });
        }
      }
    );

    /**
     * message:read - 메시지 읽음 표시
     */
    socket.on("message:read", async (data: { messageIds: string[] }) => {
      try {
        const { messageIds } = data;

        await db.message.updateMany({
          where: {
            id: { in: messageIds },
            recipientId: userId,
          },
          data: { isRead: true },
        });

        socket.broadcast.emit("message:read-receipt", {
          userId,
          messageIds,
        });

        console.log(`[Message Read] ${userId}: ${messageIds.length}개 읽음`);
      } catch (error) {
        console.error("[Message Read Error]:", error);
      }
    });

    /**
     * message:typing - 타이핑 중 표시
     */
    socket.on("message:typing", (data: { recipientId: string }) => {
      const { recipientId } = data;
      const recipientSockets = onlineUsers.get(recipientId);

      if (recipientSockets) {
        recipientSockets.forEach((socketId) => {
          io.to(socketId).emit("message:typing-indicator", {
            userId,
            isTyping: true,
          });
        });
      }
    });

    /**
     * message:stopped-typing - 타이핑 중지
     */
    socket.on("message:stopped-typing", (data: { recipientId: string }) => {
      const { recipientId } = data;
      const recipientSockets = onlineUsers.get(recipientId);

      if (recipientSockets) {
        recipientSockets.forEach((socketId) => {
          io.to(socketId).emit("message:typing-indicator", {
            userId,
            isTyping: false,
          });
        });
      }
    });

    // ============ 채팅방 관리 이벤트 ============

    /**
     * room:join - 채팅방 입장
     */
    socket.on("room:join", (data: { recipientId: string }) => {
      const { recipientId } = data;
      const roomId = [userId, recipientId].sort().join(":");

      socket.join(roomId);
      console.log(
        `[Room] ${userId} joined room: ${roomId} (${socket.id})`
      );

      // 상대방에게 입장 알림
      const recipientSockets = onlineUsers.get(recipientId);
      if (recipientSockets) {
        io.to(roomId).emit("room:user-online", {
          userId,
          onlineCount: onlineUsers.size,
        });
      }
    });

    /**
     * room:leave - 채팅방 퇴장
     */
    socket.on("room:leave", (data: { recipientId: string }) => {
      const { recipientId } = data;
      const roomId = [userId, recipientId].sort().join(":");

      socket.leave(roomId);
      console.log(`[Room] ${userId} left room: ${roomId}`);

      io.to(roomId).emit("room:user-offline", { userId });
    });

    // ============ 상태 확인 이벤트 ============

    /**
     * status:check - 사용자 온라인 상태 확인
     */
    socket.on("status:check", (data: { userIds: string[] }) => {
      const { userIds } = data;
      const statuses = userIds.map((id) => ({
        userId: id,
        isOnline: onlineUsers.has(id),
      }));

      socket.emit("status:update", { statuses });
    });

    /**
     * ping - 연결 상태 확인
     */
    socket.on("ping", () => {
      socket.emit("pong");
    });

    // ============ 연결 해제 ============

    socket.on("disconnect", () => {
      console.log(`[Socket] 사용자 연결 해제: ${userId} (${socket.id})`);

      // 온라인 사용자에서 제거
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }

      // 오프라인 상태 브로드캐스트
      io.emit("user:offline", {
        userId,
        onlineCount: onlineUsers.size,
      });
    });
  });
}

/**
 * 온라인 사용자 조회
 */
export function getOnlineUsers(): Map<string, Set<string>> {
  return onlineUsers;
}

/**
 * 특정 사용자의 온라인 여부 확인
 */
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

/**
 * 온라인 사용자 수 조회
 */
export function getOnlineCount(): number {
  return onlineUsers.size;
}

/**
 * 특정 사용자들 사이의 미읽음 메시지 수 조회
 */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    const count = await db.message.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });
    return count;
  } catch (error) {
    console.error("[Get Unread Count Error]:", error);
    return 0;
  }
}
