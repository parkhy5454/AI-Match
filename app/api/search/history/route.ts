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

    const history = await prisma.searchHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { query: true },
    });

    return NextResponse.json({
      data: history.map(h => h.query),
    });
  } catch (error) {
    console.error('검색 이력 조회 오류:', error);
    return NextResponse.json(
      { error: '검색 이력 조회 실패' },
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

    const { query } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: '검색어가 필요합니다' },
        { status: 400 }
      );
    }

    await prisma.searchHistory.create({
      data: {
        userId: user.id,
        query,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('검색 이력 추가 오류:', error);
    return NextResponse.json(
      { error: '검색 이력 추가 실패' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: '검색어가 필요합니다' },
        { status: 400 }
      );
    }

    await prisma.searchHistory.deleteMany({
      where: {
        userId: user.id,
        query,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('검색 이력 삭제 오류:', error);
    return NextResponse.json(
      { error: '검색 이력 삭제 실패' },
      { status: 500 }
    );
  }
}