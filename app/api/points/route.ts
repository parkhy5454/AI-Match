import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePaginationParams, createPaginationMeta, formatPaginatedResponse } from "@/lib/pagination";

/**
 * GET /api/points
 * 사용자의 포인트 정보 및 이력 조회
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const { searchParams } = new URL(req.url);
    const { skip, take } = parsePaginationParams({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    // 포인트 이력 조회
    const total = await db.pointHistory.count({
      where: { userId: user.id },
    });

    const history = await db.pointHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    const page = Math.max(1, parseInt(String(searchParams.get("page") || 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(searchParams.get("limit") || 20))));
    const meta = createPaginationMeta(page, limit, total);

    const response = formatPaginatedResponse(history, meta);

    return NextResponse.json({
      success: true,
      data: {
        currentPoints: user.points,
        history: response.data,
      },
      meta: response.meta,
    });
  } catch (error) {
    console.error("[Points API] GET 에러:", error);
    return NextResponse.json(
      { success: false, error: "포인트 정보 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/points/use
 * 포인트 사용
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();

    const { amount, reason, relatedId } = body;

    if (!amount || !reason) {
      return NextResponse.json(
        { success: false, error: "필수 필드가 없습니다" },
        { status: 400 }
      );
    }

    if (user.points < amount) {
      return NextResponse.json(
        { success: false, error: "포인트가 부족합니다" },
        { status: 400 }
      );
    }

    // 포인트 차감
    const updated = await db.user.update({
      where: { id: user.id },
      data: { points: { decrement: amount } },
    });

    // 포인트 이력 기록
    await db.pointHistory.create({
      data: {
        userId: user.id,
        amount: -amount,
        reason,
        relatedId: relatedId || null,
      },
    });

    // 알림 생성
    await db.notification.create({
      data: {
        userId: user.id,
        type: "system",
        title: "포인트를 사용했습니다",
        body: `${amount}포인트를 사용했습니다. 남은 포인트: ${updated.points}`,
        data: JSON.stringify({
          reason,
          amount,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: { currentPoints: updated.points },
      message: "포인트가 사용되었습니다",
    });
  } catch (error) {
    console.error("[Points API] POST 에러:", error);
    return NextResponse.json(
      { success: false, error: "포인트 사용에 실패했습니다" },
      { status: 500 }
    );
  }
}
