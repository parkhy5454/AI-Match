import { Server as SocketIOServer } from "socket.io";
import { setupSocketAuthentication, setupSocketHandlers } from "@/lib/socketHandlers";
import type { Server as HTTPServer } from "http";

let io: SocketIOServer | null = null;

/**
 * Socket.io 서버 초기화 (싱글톤)
 */
export function initializeSocket(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    maxHttpBufferSize: 1e6, // 1MB
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // 인증 미들웨어 설정
  setupSocketAuthentication(io);

  // 이벤트 핸들러 설정
  setupSocketHandlers(io);

  console.log("[Socket.io] 서버 초기화 완료");

  return io;
}

/**
 * Socket.io 서버 인스턴스 반환
 */
export function getSocket(): SocketIOServer | null {
  return io;
}

/**
 * Socket.io 서버 종료
 */
export async function closeSocket(): Promise<void> {
  if (io) {
    await io.close();
    io = null;
    console.log("[Socket.io] 서버 종료");
  }
}
