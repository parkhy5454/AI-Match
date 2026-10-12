import { NextResponse, NextRequest } from 'next/server';
import { validateEmail } from '@/lib/validation';
import { sendOtp } from '@/lib/otp';

/**
 * OTP 코드 발송
 * POST /api/auth/otp/send
 */
export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: '요청 형식이 올바르지 않습니다' },
        { status: 400 }
      );
    }

    const { email, type } = body;

    // 이메일 검증
    if (!email) {
      return NextResponse.json(
        { success: false, error: '이메일을 입력해주세요' },
        { status: 400 }
      );
    }

    const emailValidation = validateEmail(String(email).toLowerCase());
    if (!emailValidation.valid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error },
        { status: 400 }
      );
    }

    // 타입 검증
    const validTypes = ['signup', 'login', 'password-reset'];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: '유효한 타입이 필요합니다' },
        { status: 400 }
      );
    }

    // OTP 발송
    const result = await sendOtp(String(email).toLowerCase(), type);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'OTP 발송 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }

    console.log('[OTP Send] 발송됨:', String(email).toLowerCase(), type);

    return NextResponse.json({
      success: true,
      message: '인증코드가 이메일로 발송되었습니다',
    });
  } catch (error) {
    console.error('[OTP Send API] 에러:', error);
    return NextResponse.json(
      { success: false, error: 'OTP 발송 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
