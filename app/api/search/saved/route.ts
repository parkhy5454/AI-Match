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

    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      data: savedSearches,
    });
  } catch (error) {
    console.error('저장된 검색 조회 오류:', error);
    return NextResponse.json(
      { error: '저장된 검색 조회 실패' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const { name, filters } = await request.json();

    if (!name || !filters) {
      return NextResponse.json(
        { error: '필수 정보가 부족합니다' },
        { status: 400 }
      );
    }

    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId: user.id,
        name,
        filters,
      },
    });

    return NextResponse.json({
      data: savedSearch,
    });
  } catch (error) {
    console.error('검색 저장 오류:', error);
    return NextResponse.json(
      { error: '검색 저장 실패' },
      { status: 500 }
    );
  }
}