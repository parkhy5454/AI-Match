import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { searchId: string } }
) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const { searchId } = params;

    const savedSearch = await prisma.savedSearch.findUnique({
      where: { id: searchId },
    });

    if (!savedSearch || savedSearch.userId !== user.id) {
      return NextResponse.json(
        { error: '검색을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    await prisma.savedSearch.delete({
      where: { id: searchId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('저장된 검색 삭제 오류:', error);
    return NextResponse.json(
      { error: '저장된 검색 삭제 실패' },
      { status: 500 }
    );
  }
}