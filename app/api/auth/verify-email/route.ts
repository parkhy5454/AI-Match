import { NextResponse, NextRequest } from "next/server";
import { validateEmail } from "@/lib/validation";
import { db } from "@/lib/db";
import { generateResetToken, verifyResetToken } from "@/lib/auth";

/**
 * 이메일 인증 토큰 발송
 * POST /api/auth/verify-email/send
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, type = "signup" } = body;

    if (!email) {
      return NextResponse.json(
        { error: "이메일을 입력해주세요" },
        { status: 400 }
      );
    }

    // 이메일 검증
    const emailValidation = validateEmail(String(email).toLowerCase());
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // 사용자 존재 여부 확인
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { emailVerified: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "가입된 이메일이 없습니다" },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "이미 인증된 이메일입니다" },
        { status: 400 }
      );
    }

    // 인증 토큰 생성 (1시간 유효)
    const token = generateResetToken(normalizedEmail);

    // 실제 프로덕션에서는 Resend를 통해 이메일 발송
    // 현재는 토큰을 응답으로 반환 (개발용)
    const verifyLink = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;

    console.log("[Email Verify] 인증 링크:", verifyLink);

    return NextResponse.json({
      success: true,
      message: "인증 이메일이 발송되었습니다",
      // 개발용 - 프로덕션에서는 제거
      token: process.env.NODE_ENV === "development" ? token : undefined,
    });
  } catch (error) {
    console.error("[Email Verify API] 에러:", error);
    return NextResponse.json(
      { error: "이메일 인증 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * 이메일 인증 확인
 * GET /api/auth/verify-email?token=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "인증 토큰이 없습니다" },
        { status: 400 }
      );
    }

    // 토큰 검증
    const decoded = verifyResetToken(token);
    if (!decoded || !decoded.email) {
      return NextResponse.json(
        { error: "유효하지 않거나 만료된 토큰입니다" },
        { status: 401 }
      );
    }

    // 이메일 인증 완료 표시
    const user = await db.user.update({
      where: { email: decoded.email },
      data: { emailVerified: true },
      select: { id: true, email: true },
    });

    console.log("[Email Verify] 이메일 인증 완료:", user.email);

    return NextResponse.json({
      success: true,
      message: "이메일 인증이 완료되었습니다",
      data: { email: user.email },
    });
  } catch (error) {
    console.error("[Email Verify Get API] 에러:", error);
    return NextResponse.json(
      { error: "이메일 인증 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
