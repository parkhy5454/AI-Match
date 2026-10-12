import { NextResponse, NextRequest } from 'next/server';
import { validateEmail } from '@/lib/validation';
import { verifyOtp } from '@/lib/otp';
import { checkRateLimit } from '@/lib/rateLimiter';

/**
 * OTP 코드 검증
 * POST /api/auth/otp/verify
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

    const { email, code, type } = body;

    // 필수 필드 검증
    if (!email || !code || !type) {
      return NextResponse.json(
        { success: false, error: '모든 필드를 입력해주세요' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailValidation = validateEmail(String(email).toLowerCase());
    if (!emailValidation.valid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error },
        { status: 400 }
      );
    }

    // 코드 형식 검증 (6자리 숫자)
    const codeStr = String(code).trim();
    if (!/^\d{6}$/.test(codeStr)) {
      return NextResponse.json(
        { success: false, error: '인증코드는 6자리 숫자입니다' },
        { status: 400 }
      );
    }

    // 타입 검증
    const validTypes = ['signup', 'login', 'password-reset'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: '유효한 타입이 필요합니다' },
        { status: 400 }
      );
    }

    // Rate limiting - 이메일당 5분에 5회 시도로 제한
    const rateLimitKey = `otp-verify:${String(email).toLowerCase()}`;
    const rateLimit = checkRateLimit(rateLimitKey, 5, 5 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: '너무 많은 검증 시도가 있었습니다. 잠시 후 다시 시도해주세요.',
        },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
      );
    }

    // OTP 검증
    const result = await verifyOtp(
      String(email).toLowerCase(),
      codeStr,
      type
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'OTP 검증 실패' },
        { status: 400 }
      );
    }

    console.log('[OTP Verify] 검증 성공:', String(email).toLowerCase(), type);

    return NextResponse.json({
      success: true,
      message: '인증 성공',
    });
  } catch (error) {
    console.error('[OTP Verify API] 에러:', error);
    return NextResponse.json(
      { success: false, error: 'OTP 검증 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
