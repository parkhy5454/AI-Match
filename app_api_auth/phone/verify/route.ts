import { NextResponse, NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import prisma from '@/lib/db';
import { verifyOTP } from '@/lib/phoneAuth';

/**
 * 휴대폰 인증 OTP 검증
 * POST /api/auth/phone/verify
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

    const { phone, otp } = body;

    if (!phone || !otp) {
      return NextResponse.json(
        { success: false, error: '휴대폰 번호와 인증코드가 필요합니다' },
        { status: 400 }
      );
    }

    // 저장된 OTP 조회
    const phoneAuth = await prisma.phoneAuth.findUnique({
      where: { phone },
    });

    if (!phoneAuth) {
      return NextResponse.json(
        { success: false, error: '발송된 인증코드가 없습니다. 다시 신청해주세요' },
        { status: 404 }
      );
    }

    // OTP 검증
    const isValid = verifyOTP(phoneAuth.otp, otp, phoneAuth.expiresAt);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '인증코드가 일치하지 않거나 만료되었습니다' },
        { status: 400 }
      );
    }

    // 휴대폰 인증 완료
    await prisma.phoneAuth.update({
      where: { phone },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        userId: user.id,
      },
    });

    // 사용자 프로필에 휴대폰 정보 저장
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phone,
        phoneVerified: true,
      },
    });

    console.log('[Phone Auth] 인증 완료:', user.id, '전화:', phone);

    return NextResponse.json({
      success: true,
      message: '휴대폰 인증이 완료되었습니다',
      phone,
      phoneVerified: true,
    });
  } catch (error) {
    console.error('[Phone Auth Verify] 에러:', error);
    return NextResponse.json(
      { success: false, error: 'OTP 검증 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
