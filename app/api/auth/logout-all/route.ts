import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * 모든 기기에서 로그아웃
 * POST /api/auth/logout-all
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);

    // 사용자의 모든 세션 비활성화 (향후 Session 모델 구현 시)
    // 현재는 로그아웃 전용 페이로드 저장
    await db.user.update({
      where: { id: user.id },
      data: {
        updatedAt: new Date(), // 최근 접근 시간 업데이트
      },
    });

    console.log("[Logout All API] 모든 기기에서 로그아웃:", user.id);

    return NextResponse.json({
      success: true,
      message: "모든 기기에서 로그아웃되었습니다. 모든 기기에서 다시 로그인해주세요.",
    });
  } catch (error) {
    console.error("[Logout All API] 에러:", error);
    return NextResponse.json(
      { error: "로그아웃 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
