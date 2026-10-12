import { NextResponse, NextRequest } from "next/server";
import { sendOTPEmail, checkRecentOTP } from "@/lib/otp";
import { validateEmail } from "@/lib/validation";

/**
 * POST /api/auth/otp/send
 * OTP 코드 발송
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, type = "signup" } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "이메일을 입력해주세요" },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error },
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

    // 최근에 발송된 OTP가 있는지 확인
    const recentOTP = await checkRecentOTP(email, type);
    if (recentOTP) {
      return NextResponse.json(
        { 
          success: false, 
          error: "최근에 인증 코드가 발송되었습니다. 잠시 후 다시 시도해주세요.",
          expiresIn: Math.ceil((recentOTP.expiresAt.getTime() - Date.now()) / 1000)
        },
        { status: 429 }
      );
    }

    // OTP 발송
    const result = await sendOTPEmail(email, type);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "인증 코드가 이메일로 발송되었습니다",
      data: {
        email,
        expiresIn: 600, // 10분 (초 단위)
      },
    });
  } catch (error) {
    console.error("[OTP Send API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "OTP 발송 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
