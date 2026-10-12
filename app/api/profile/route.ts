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

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        age: true,
        gender: true,
        region: true,
        mbti: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    return NextResponse.json(
      { error: '프로필 조회 실패' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { username, email, ...updateData } = data;

    const profile = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        age: true,
        gender: true,
        region: true,
        mbti: true,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error('프로필 업데이트 오류:', error);
    return NextResponse.json(
      { error: '프로필 업데이트 실패' },
      { status: 500 }
    );
  }
}