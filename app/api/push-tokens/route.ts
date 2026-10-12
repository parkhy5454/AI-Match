import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/push-tokens
 * 푸시 알림 토큰 등록
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();

    const { token, deviceType } = body;

    if (!token || !deviceType) {
      return NextResponse.json(
        { success: false, error: "필수 필드가 없습니다" },
        { status: 400 }
      );
    }

    // 유효한 deviceType 확인
    const validDeviceTypes = ["ios", "android", "web"];
    if (!validDeviceTypes.includes(deviceType)) {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 디바이스 타입입니다" },
        { status: 400 }
      );
    }

    // 기존 토큰 확인
    const existingToken = await db.pushToken.findUnique({
      where: { token },
    });

    if (existingToken && existingToken.userId === user.id) {
      // 이미 등록된 토큰이면 활성화
      await db.pushToken.update({
        where: { token },
        data: { isActive: true, updatedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: "푸시 토큰이 이미 등록되어 있습니다",
      });
    }

    // 새 토큰 등록
    const pushToken = await db.pushToken.create({
      data: {
        userId: user.id,
        token,
        deviceType,
      },
    });

    return NextResponse.json({
      success: true,
      data: pushToken,
      message: "푸시 토큰이 등록되었습니다",
    });
  } catch (error) {
    console.error("[Push Tokens API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "토큰 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push-tokens/:token
 * 푸시 토큰 제거
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "토큰이 필요합니다" },
        { status: 400 }
      );
    }

    const pushToken = await db.pushToken.findUnique({
      where: { token },
    });

    if (!pushToken) {
      return NextResponse.json(
        { success: false, error: "토큰을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (pushToken.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "권한이 없습니다" },
        { status: 403 }
      );
    }

    await db.pushToken.delete({
      where: { token },
    });

    return NextResponse.json({
      success: true,
      message: "푸시 토큰이 제거되었습니다",
    });
  } catch (error) {
    console.error("[Push Tokens API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "토큰 제거에 실패했습니다" },
      { status: 500 }
    );
  }
}
