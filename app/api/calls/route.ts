import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePaginationParams, createPaginationMeta, formatPaginatedResponse } from "@/lib/pagination";

/**
 * GET /api/calls
 * 통화 기록 조회
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const { searchParams } = new URL(req.url);
    const { skip, take } = parsePaginationParams({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    const total = await db.callSession.count({
      where: {
        OR: [
          { callerId: user.id },
          { calleeId: user.id },
        ],
      },
    });

    const calls = await db.callSession.findMany({
      where: {
        OR: [
          { callerId: user.id },
          { calleeId: user.id },
        ],
      },
      include: {
        caller: {
          select: { id: true, username: true, profileImage: true },
        },
        callee: {
          select: { id: true, username: true, profileImage: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    const page = Math.max(1, parseInt(String(searchParams.get("page") || 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(searchParams.get("limit") || 20))));
    const meta = createPaginationMeta(page, limit, total);

    const response = formatPaginatedResponse(calls, meta);

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    });
  } catch (error) {
    console.error("[Calls API] GET 에러:", error);
    return NextResponse.json(
      { success: false, error: "통화 기록 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calls
 * 통화 시작
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();

    const { calleeId, callType } = body;

    if (!calleeId || !callType) {
      return NextResponse.json(
        { success: false, error: "필수 필드가 없습니다" },
        { status: 400 }
      );
    }

    if (!["voice", "video"].includes(callType)) {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 통화 타입입니다" },
        { status: 400 }
      );
    }

    // 자신에게 통화 불가
    if (calleeId === user.id) {
      return NextResponse.json(
        { success: false, error: "자신에게 통화할 수 없습니다" },
        { status: 400 }
      );
    }

    // 통화 상대방 확인
    const callee = await db.user.findUnique({
      where: { id: calleeId },
    });

    if (!callee) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 통화 세션 생성
    const callSession = await db.callSession.create({
      data: {
        callerId: user.id,
        calleeId,
        callType,
        status: "pending",
      },
      include: {
        caller: {
          select: { id: true, username: true, profileImage: true },
        },
        callee: {
          select: { id: true, username: true, profileImage: true },
        },
      },
    });

    // 알림 생성
    await db.notification.create({
      data: {
        userId: calleeId,
        type: "message",
        title: `${user.username}님이 ${callType === "video" ? "영상" : "음성"} 통화를 요청합니다`,
        body: "수락하거나 거절하세요",
        data: JSON.stringify({
          callId: callSession.id,
          callerId: user.id,
          callerUsername: user.username,
          callType,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: callSession,
      message: "통화가 시작되었습니다",
    });
  } catch (error) {
    console.error("[Calls API] POST 에러:", error);
    return NextResponse.json(
      { success: false, error: "통화 시작에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/calls/:id
 * 통화 상태 업데이트
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const body = await req.json();

    const { status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "필수 필드가 없습니다" },
        { status: 400 }
      );
    }

    const callSession = await db.callSession.findUnique({
      where: { id },
    });

    if (!callSession) {
      return NextResponse.json(
        { success: false, error: "통화를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 본인과 관련된 통화만 수정 가능
    if (callSession.callerId !== user.id && callSession.calleeId !== user.id) {
      return NextResponse.json(
        { success: false, error: "권한이 없습니다" },
        { status: 403 }
      );
    }

    const now = new Date();
    const updated = await db.callSession.update({
      where: { id },
      data: {
        status,
        ...(status === "active" && { startTime: now }),
        ...(status === "ended" && { endTime: now }),
        ...(status === "ended" && callSession.startTime && {
          duration: Math.floor(
            (now.getTime() - callSession.startTime.getTime()) / 1000
          ),
        }),
      },
      include: {
        caller: {
          select: { id: true, username: true },
        },
        callee: {
          select: { id: true, username: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[Calls API] PUT 에러:", error);
    return NextResponse.json(
      { success: false, error: "통화 업데이트에 실패했습니다" },
      { status: 500 }
    );
  }
}
