import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePaginationParams, createPaginationMeta, formatPaginatedResponse } from "@/lib/pagination";

/**
 * GET /api/events
 * 이벤트 목록 조회
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { skip, take } = parsePaginationParams({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });
    const status = searchParams.get("status") || "upcoming";

    const total = await db.event.count({
      where: { status },
    });

    const events = await db.event.findMany({
      where: { status },
      include: {
        creator: {
          select: { id: true, username: true, profileImage: true },
        },
        participants: {
          select: { userId: true, status: true },
        },
      },
      orderBy: { eventDate: "asc" },
      skip,
      take,
    });

    const page = Math.max(1, parseInt(String(searchParams.get("page") || 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(searchParams.get("limit") || 20))));
    const meta = createPaginationMeta(page, limit, total);

    const response = formatPaginatedResponse(events, meta);

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    });
  } catch (error) {
    console.error("[Events API] GET 에러:", error);
    return NextResponse.json(
      { success: false, error: "이벤트 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * 새 이벤트 생성
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();

    const {
      name,
      description,
      location,
      latitude,
      longitude,
      eventDate,
      capacity,
      coverImage,
    } = body;

    if (!name || !location || !eventDate) {
      return NextResponse.json(
        { success: false, error: "필수 필드가 없습니다" },
        { status: 400 }
      );
    }

    const event = await db.event.create({
      data: {
        name,
        description: description || null,
        location,
        latitude,
        longitude,
        eventDate: new Date(eventDate),
        capacity,
        coverImage: coverImage || null,
        creatorId: user.id,
      },
      include: {
        creator: {
          select: { id: true, username: true, profileImage: true },
        },
        participants: true,
      },
    });

    // 알림 생성
    await db.notification.create({
      data: {
        userId: user.id,
        type: "system",
        title: "새 이벤트가 생성되었습니다 🎉",
        body: event.name,
        data: JSON.stringify({
          eventId: event.id,
          eventName: event.name,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: event,
      message: "이벤트가 생성되었습니다",
    });
  } catch (error) {
    console.error("[Events API] POST 에러:", error);
    return NextResponse.json(
      { success: false, error: "이벤트 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
