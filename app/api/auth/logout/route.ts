import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimiter";

/**
 * POST /api/auth/logout
 * 로그아웃 처리
 * 
 * 변경사항:
 * - auth/logout/route.js → route.ts로 변환
 * - requireUser 사용으로 인증 통일
 * - 일관된 응답 형식
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const limitKey = `logout:${ip}`;
    const rateLimit = checkRateLimit(limitKey, 20, 60000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "너무 많은 로그아웃 시도가 있었습니다" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
      );
    }

    // 인증 확인
    const user = await requireUser(req);

    // 로그아웃 처리 (클라이언트에서 localStorage 토큰 제거)
    console.log("[Logout API] 로그아웃:", user.id);

    return NextResponse.json(
      {
        success: true,
        message: "로그아웃 성공",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Logout API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "로그아웃 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
