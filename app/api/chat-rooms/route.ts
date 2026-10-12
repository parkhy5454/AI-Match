import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePaginationParams, createPaginationMeta, formatPaginatedResponse } from "@/lib/pagination";

/**
 * GET /api/chat-rooms
 * 사용자의 채팅방 목록 조회
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const { searchParams } = new URL(req.url);
    const { skip, take } = parsePaginationParams({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    const rooms = await db.chatRoom.findMany({
      where: {
        members: {
          some: {
            userId: user.id,
            leftAt: null,
          },
        },
      },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profileImage: true,
              },
            },
          },
        },
        groupMessages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            room: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: {
        groupMessages: {
          _count: "desc",
        },
      },
      skip,
      take,
    });

    const total = await db.chatRoom.count({
      where: {
        members: {
          some: {
            userId: user.id,
            leftAt: null,
          },
        },
      },
    });

    const page = Math.max(1, parseInt(String(searchParams.get("page") || 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(searchParams.get("limit") || 20))));
    const meta = createPaginationMeta(page, limit, total);

    const response = formatPaginatedResponse(rooms, meta);

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    });
  } catch (error) {
    console.error("[Chat Rooms API] GET 에러:", error);
    return NextResponse.json(
      { success: false, error: "채팅방 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat-rooms
 * 새 채팅방 생성
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();

    const { name, type, memberIds } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: "채팅방 타입이 필요합니다" },
        { status: 400 }
      );
    }

    if (type === "direct" && memberIds && memberIds.length === 1) {
      // Direct 채팅: 두 사용자 사이의 1:1 채팅
      const otherUserId = memberIds[0];

      // 이미 존재하는 direct 채팅방 확인
      const existingRoom = await db.chatRoom.findFirst({
        where: {
          type: "direct",
          members: {
            every: {
              OR: [{ userId: user.id }, { userId: otherUserId }],
            },
          },
        },
      });

      if (existingRoom) {
        return NextResponse.json({
          success: true,
          data: existingRoom,
          message: "이미 존재하는 채팅방입니다",
        });
      }

      // 새 direct 채팅방 생성
      const room = await db.chatRoom.create({
        data: {
          type: "direct",
          creatorId: user.id,
          members: {
            create: [
              { userId: user.id },
              { userId: otherUserId },
            ],
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  profileImage: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: room,
        message: "채팅방이 생성되었습니다",
      });
    } else if (type === "group" && memberIds && memberIds.length > 0) {
      // Group 채팅
      if (!name) {
        return NextResponse.json(
          { success: false, error: "그룹 채팅방 이름이 필요합니다" },
          { status: 400 }
        );
      }

      const room = await db.chatRoom.create({
        data: {
          name,
          type: "group",
          creatorId: user.id,
          members: {
            create: [
              { userId: user.id },
              ...memberIds.map((id: string) => ({ userId: id })),
            ],
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  profileImage: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: room,
        message: "그룹 채팅방이 생성되었습니다",
      });
    }

    return NextResponse.json(
      { success: false, error: "유효하지 않은 요청입니다" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Chat Rooms API] POST 에러:", error);
    return NextResponse.json(
      { success: false, error: "채팅방 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
