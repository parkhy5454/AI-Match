import { NextResponse, NextRequest } from "next/server";
import { verifyOTPCode } from "@/lib/otp";

/**
 * POST /api/auth/otp/verify
 * OTP 코드 검증
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code, type = "signup" } = body;

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: "이메일과 인증 코드를 입력해주세요" },
        { status: 400 }
      );
    }

    // 코드 형식 검증 (6자리 숫자)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: "인증 코드는 6자리 숫자여야 합니다" },
        { status: 400 }
      );
    }

    // 유효한 type 확인
    const validTypes = ["signup", "login", "password-reset"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 요청입니다" },
        { status: 400 }
      );
    }

    // OTP 검증
    const result = await verifyOTPCode(email, code, type);
    
    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "이메일 인증 성공",
      data: {
        email,
        verified: true,
      },
    });
  } catch (error) {
    console.error("[OTP Verify API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "OTP 검증 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
