import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePaginationParams, createPaginationMeta, formatPaginatedResponse } from "@/lib/pagination";

/**
 * GET /api/gift
 * 받은 선물 조회
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const { searchParams } = new URL(req.url);
    const { skip, take } = parsePaginationParams({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    const total = await db.gift.count({
      where: { recipientId: user.id },
    });

    const gifts = await db.gift.findMany({
      where: { recipientId: user.id },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profileImage: true,
            gender: true,
            age: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    const page = Math.max(1, parseInt(String(searchParams.get("page") || 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(searchParams.get("limit") || 20))));
    const meta = createPaginationMeta(page, limit, total);

    const response = formatPaginatedResponse(gifts, meta);

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    });
  } catch (error) {
    console.error("[Gift API] GET 에러:", error);
    return NextResponse.json(
      { success: false, error: "선물 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gift
 * 선물 보내기
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();

    const { recipientId, giftType, message } = body;

    // 유효성 검사
    if (!recipientId || !giftType) {
      return NextResponse.json(
        { success: false, error: "필수 필드가 없습니다" },
        { status: 400 }
      );
    }

    // 자신에게 선물 못함
    if (recipientId === user.id) {
      return NextResponse.json(
        { success: false, error: "자신에게는 선물을 보낼 수 없습니다" },
        { status: 400 }
      );
    }

    // 수신자 존재 확인
    const recipient = await db.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 선물 저장
    const gift = await db.gift.create({
      data: {
        senderId: user.id,
        recipientId,
        giftType,
        message: message || null,
      },
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

    // 알림 생성
    await db.notification.create({
      data: {
        userId: recipientId,
        type: "gift",
        title: `${user.username}님이 선물을 보냈습니다 🎁`,
        body: `${giftType} 선물을 받았습니다!`,
        data: JSON.stringify({
          giftId: gift.id,
          senderId: user.id,
          senderUsername: user.username,
          giftType,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: gift,
      message: "선물이 전송되었습니다",
    });
  } catch (error) {
    console.error("[Gift API] POST 에러:", error);
    return NextResponse.json(
      { success: false, error: "선물 전송에 실패했습니다" },
      { status: 500 }
    );
  }
}
