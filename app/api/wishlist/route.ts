import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePaginationParams, createPaginationMeta, formatPaginatedResponse } from "@/lib/pagination";

/**
 * GET /api/wishlist
 * 위시리스트 조회
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const { searchParams } = new URL(req.url);
    const { skip, take } = parsePaginationParams({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    const total = await db.like.count({
      where: { userId: user.id },
    });

    const likes = await db.like.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        likedUser: {
          select: {
            id: true,
            username: true,
            profileImage: true,
            age: true,
            region: true,
            bio: true,
            mbti: true,
          },
        },
      },
    });

    const page = Math.max(1, parseInt(String(searchParams.get("page") || 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(searchParams.get("limit") || 20))));
    const meta = createPaginationMeta(page, limit, total);

    const response = formatPaginatedResponse(likes, meta);

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    });
  } catch (error) {
    console.error("[Wishlist API] GET 에러:", error);
    return NextResponse.json(
      { success: false, error: "위시리스트 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wishlist
 * 위시리스트에 추가
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { likedUserId } = body;

    if (!likedUserId) {
      return NextResponse.json(
        { success: false, error: "likedUserId가 필요합니다" },
        { status: 400 }
      );
    }

    if (likedUserId === user.id) {
      return NextResponse.json(
        { success: false, error: "자신을 좋아요 할 수 없습니다" },
        { status: 400 }
      );
    }

    // 이미 좋아요했는지 확인
    const existing = await db.like.findUnique({
      where: {
        userId_likedUserId: {
          userId: user.id,
          likedUserId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "이미 좋아요한 사용자입니다" },
        { status: 400 }
      );
    }

    const like = await db.like.create({
      data: {
        userId: user.id,
        likedUserId,
      },
      include: {
        likedUser: {
          select: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
      },
    });

    // 알림 생성 (상대방에게)
    await db.notification.create({
      data: {
        userId: likedUserId,
        type: "like",
        title: `${user.username}님이 좋아요했습니다`,
        body: "프로필을 확인해보세요",
        data: JSON.stringify({
          userId: user.id,
          username: user.username,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: like,
      message: "위시리스트에 추가되었습니다",
    });
  } catch (error) {
    console.error("[Wishlist API] POST 에러:", error);
    return NextResponse.json(
      { success: false, error: "위시리스트 추가에 실패했습니다" },
      { status: 500 }
    );
  }
}
