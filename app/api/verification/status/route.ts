import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const verification = await prisma.verification.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      data: {
        emailVerified: verification?.emailVerified || false,
        phoneVerified: verification?.phoneVerified || false,
        photoVerified: verification?.photoVerified || false,
      },
    });
  } catch (error) {
    console.error('검증 상태 조회 오류:', error);
    return NextResponse.json(
      { error: '검증 상태 조회 실패' },
      { status: 500 }
    );
  }
}