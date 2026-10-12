import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/blocked-users
 * 차단한 사용자 목록 조회
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(String(searchParams.get("limit") || 20))));
    const skip = Math.max(0, (parseInt(String(searchParams.get("page") || 1)) - 1) * limit);

    const total = await db.blockedUser.count({
      where: { userId: user.id },
    });

    const blockedUsers = await db.blockedUser.findMany({
      where: { userId: user.id },
      include: {
        blockedUser: {
          select: {
            id: true,
            username: true,
            profileImage: true,
            age: true,
            region: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: blockedUsers,
      meta: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(String(searchParams.get("page") || 1)),
      },
    });
  } catch (error) {
    console.error("[Blocked Users API] GET 에러:", error);
    return NextResponse.json(
      { success: false, error: "차단 목록 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blocked-users
 * 사용자 차단
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { blockedUserId } = body;

    if (!blockedUserId) {
      return NextResponse.json(
        { success: false, error: "blockedUserId가 필요합니다" },
        { status: 400 }
      );
    }

    if (blockedUserId === user.id) {
      return NextResponse.json(
        { success: false, error: "자신을 차단할 수 없습니다" },
        { status: 400 }
      );
    }

    // 이미 차단했는지 확인
    const existing = await db.blockedUser.findUnique({
      where: {
        userId_blockedUserId: {
          userId: user.id,
          blockedUserId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "이미 차단한 사용자입니다" },
        { status: 400 }
      );
    }

    const blocked = await db.blockedUser.create({
      data: {
        userId: user.id,
        blockedUserId,
      },
      include: {
        blockedUser: {
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
        userId: user.id,
        type: "system",
        title: "사용자를 차단했습니다",
        body: `${blocked.blockedUser.username}를 차단했습니다`,
        data: JSON.stringify({
          blockedUserId,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: blocked,
      message: "사용자를 차단했습니다",
    });
  } catch (error) {
    console.error("[Blocked Users API] POST 에러:", error);
    return NextResponse.json(
      { success: false, error: "사용자 차단에 실패했습니다" },
      { status: 500 }
    );
  }
}
