import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimiter";

/**
 * GET /api/matches/recommendations
 * 추천 프로필 조회 (같은 지역)
 *
 * 변경사항:
 * - matches/route.js → matches/recommendations/route.ts로 이동 및 TypeScript 변환
 * - requireUser 사용으로 인증 통일
 * - 일관된 응답 형식
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const limitKey = `recommendations:${ip}`;
    const rateLimit = checkRateLimit(limitKey, 30, 60000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "너무 많은 요청을 보냈습니다" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
      );
    }

    const user = await requireUser(req);

    // 현재 사용자 조회
    const currentUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        region: true,
        isPrivate: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 잠재적 매칭 프로필 조회 (같은 지역)
    const potentialMatches = await db.user.findMany({
      where: {
        id: { not: user.id },
        region: currentUser.region,
        isPrivate: false, // 공개 프로필만 표시
      },
      select: {
        id: true,
        username: true,
        age: true,
        region: true,
        mbti: true,
        bio: true,
        profileImage: true,
      },
      take: 10,
    });

    console.log("[Recommendations API] 추천 프로필 조회됨:", potentialMatches.length, "개");

    return NextResponse.json({
      success: true,
      data: potentialMatches,
      message: "추천 프로필 조회 성공",
    });
  } catch (error) {
    console.error("[Recommendations API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "추천 프로필 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
