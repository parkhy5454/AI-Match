import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePaginationParams, createPaginationMeta, formatPaginatedResponse } from "@/lib/pagination";

/**
 * GET /api/chat-rooms/:roomId/messages
 * 채팅방의 메시지 조회
 */
export async function GET(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const user = await requireUser(req);
    const { roomId } = params;

    // 채팅방 멤버 확인
    const membership = await db.chatRoomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: "채팅방에 접근할 수 없습니다" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const { skip, take } = parsePaginationParams({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    const total = await db.groupMessage.count({
      where: { roomId },
    });

    const messages = await db.groupMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    const page = Math.max(1, parseInt(String(searchParams.get("page") || 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(searchParams.get("limit") || 20))));
    const meta = createPaginationMeta(page, limit, total);

    const response = formatPaginatedResponse(messages.reverse(), meta);

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    });
  } catch (error) {
    console.error("[Chat Messages API] GET 에러:", error);
    return NextResponse.json(
      { success: false, error: "메시지 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat-rooms/:roomId/messages
 * 채팅방에 메시지 전송
 */
export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const user = await requireUser(req);
    const { roomId } = params;
    const body = await req.json();

    const { content, imageUrl } = body;

    if (!content && !imageUrl) {
      return NextResponse.json(
        { success: false, error: "메시지 내용이 필요합니다" },
        { status: 400 }
      );
    }

    // 채팅방 멤버 확인
    const membership = await db.chatRoomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: "채팅방에 접근할 수 없습니다" },
        { status: 403 }
      );
    }

    // 메시지 생성
    const message = await db.groupMessage.create({
      data: {
        roomId,
        senderId: user.id,
        content: content || "",
        imageUrl: imageUrl || null,
      },
    });

    // 모든 채팅방 멤버에게 알림 생성
    const members = await db.chatRoomMember.findMany({
      where: {
        roomId,
        userId: { not: user.id },
        leftAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    // 채팅방 정보 조회
    const room = await db.chatRoom.findUnique({
      where: { id: roomId },
      select: { name: true, type: true },
    });

    for (const member of members) {
      await db.notification.create({
        data: {
          userId: member.userId,
          type: "message",
          title: `${user.username}님이 메시지를 보냈습니다`,
          body: content || "(이미지)",
          data: JSON.stringify({
            roomId,
            messageId: message.id,
            senderId: user.id,
            senderUsername: user.username,
            roomName: room?.name,
            roomType: room?.type,
          }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: message,
      message: "메시지가 전송되었습니다",
    });
  } catch (error) {
    console.error("[Chat Messages API] POST 에러:", error);
    return NextResponse.json(
      { success: false, error: "메시지 전송에 실패했습니다" },
      { status: 500 }
    );
  }
}
