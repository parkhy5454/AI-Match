import { NextResponse, NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import prisma from '@/lib/db';
import { validatePhoneNumber, generateOTP, getOTPExpiresAt } from '@/lib/phoneAuth';

/**
 * 휴대폰 인증 OTP 발송
 * POST /api/auth/phone/send
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: '요청 형식이 올바르지 않습니다' },
        { status: 400 }
      );
    }

    const { phone } = body;

    // 휴대폰 번호 유효성 검증
    if (!phone || !validatePhoneNumber(phone)) {
      return NextResponse.json(
        { success: false, error: '올바른 휴대폰 번호 형식이 아닙니다 (010-1234-5678)' },
        { status: 400 }
      );
    }

    // 이미 인증된 번호인지 확인
    const existingPhone = await prisma.phoneAuth.findUnique({
      where: { phone },
    });

    if (existingPhone && existingPhone.userId !== user.id && existingPhone.isVerified) {
      return NextResponse.json(
        { success: false, error: '이미 다른 계정에서 인증된 휴대폰 번호입니다' },
        { status: 409 }
      );
    }

    // OTP 생성
    const otp = generateOTP();
    const expiresAt = getOTPExpiresAt(5); // 5분 유효

    // OTP 저장 (기존 것이 있으면 업데이트)
    await prisma.phoneAuth.upsert({
      where: { phone },
      update: {
        otp,
        expiresAt,
        isVerified: false,
      },
      create: {
        phone,
        userId: user.id,
        otp,
        expiresAt,
        isVerified: false,
      },
    });

    console.log('[Phone Auth] OTP 발송:', user.id, '전화:', phone, 'OTP:', otp);

    // 실제 서비스에서는 여기서 SMS 발송
    // await sendSMS(phone, `[AI-Match] 인증코드: ${otp}`);

    return NextResponse.json({
      success: true,
      message: '인증코드가 발송되었습니다 (테스트 모드: 콘솔 확인)',
      maskedPhone: phone.replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3'),
      expiresIn: 300, // 5분 (초 단위)
    });
  } catch (error) {
    console.error('[Phone Auth Send] 에러:', error);
    return NextResponse.json(
      { success: false, error: 'OTP 발송 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
