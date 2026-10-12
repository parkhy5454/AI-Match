import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } } | any,
) {
  try {
    const u = await requireUser(req);

    if (!params.id || typeof params.id !== 'string') {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 매치 ID입니다" },
        { status: 400 }
      );
    }

    const m = await db.match.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userAId: true,
        userBId: true,
        userA: { select: { username: true, profileImage: true } },
        userB: { select: { username: true, profileImage: true } },
      },
    });

    if (!m || ![m.userAId, m.userBId].includes(u.id)) {
      return NextResponse.json(
        { success: false, error: "접근 권한이 없습니다" },
        { status: 403 }
      );
    }

    const msgs = await db.message.findMany({
      where: { matchId: m.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        body: true,
        senderId: true,
        createdAt: true,
      },
      take: 200,
    });

    const other = m.userAId === u.id ? m.userB : m.userA;

    return NextResponse.json({
      success: true,
      data: {
        other: { username: other.username, profileImage: other.profileImage },
        messages: msgs.map((x) => ({ ...x, mine: x.senderId === u.id })),
      },
    });
  } catch (error) {
    console.error("[Chat API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "메시지 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } } | any,
) {
  try {
    const u = await requireUser(req);

    if (!params.id || typeof params.id !== 'string') {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 매치 ID입니다" },
        { status: 400 }
      );
    }

    const m = await db.match.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userAId: true,
        userBId: true,
        isActive: true,
      },
    });

    if (!m || ![m.userAId, m.userBId].includes(u.id) || !m.isActive) {
      return NextResponse.json(
        { success: false, error: "접근 권한이 없습니다" },
        { status: 403 }
      );
    }

    let body;
    try {
      const jsonBody = await req.json();
      body = String(jsonBody.body || "").trim();
    } catch (parseError) {
      console.error("[Chat API] JSON 파싱 에러:", parseError);
      return NextResponse.json(
        { success: false, error: "요청 형식이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    if (!body || body.length === 0 || body.length > 1000) {
      return NextResponse.json(
        { success: false, error: "메시지는 1~1000자여야 합니다" },
        { status: 400 }
      );
    }

    // 메시지 저장
    const receiverId = m.userAId === u.id ? m.userBId : m.userAId;
    const message = await db.message.create({
      data: {
        matchId: m.id,
        senderId: u.id,
        receiverId,
        body,
      },
      select: {
        id: true,
        body: true,
        senderId: true,
        createdAt: true,
      },
    });

    console.log("[Chat API] 메시지 생성:", m.id);

    return NextResponse.json({
      success: true,
      data: message,
      message: "메시지 전송 성공",
    });
  } catch (error) {
    console.error("[Chat API] 예상치 못한 에러:", error);
    return NextResponse.json(
      { success: false, error: "메시지 전송 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
