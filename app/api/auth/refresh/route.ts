import { NextResponse, NextRequest } from "next/server";
import { verifyRefreshToken, generateToken } from "@/lib/auth";

/**
 * POST /api/auth/refresh
 * 리프레시 토큰을 사용하여 새로운 액세스 토큰 발급
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: "리프레시 토큰이 필요합니다" },
        { status: 400 }
      );
    }

    // 리프레시 토큰 검증
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 또는 만료된 리프레시 토큰입니다" },
        { status: 401 }
      );
    }

    // 새로운 액세스 토큰 생성
    const newAccessToken = generateToken(decoded.userId);
    const accessTokenExpiresIn = 24 * 60 * 60 * 1000; // 24시간
    const accessTokenExpiresAt = new Date(Date.now() + accessTokenExpiresIn);

    console.log("[Token Refresh API] 토큰 갱신 성공:", decoded.userId);

    return NextResponse.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
        accessTokenExpiresIn: '24h'
      },
      message: "토큰 갱신 성공",
    });
  } catch (error) {
    console.error("[Token Refresh API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "토큰 갱신 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
