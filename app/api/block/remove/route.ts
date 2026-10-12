import { NextResponse, NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import prisma from '@/lib/db';

/**
 * 사용자 차단 해제
 * POST /api/block/remove
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

    const { blockedUserId } = body;

    // 필수 필드 검증
    if (!blockedUserId) {
      return NextResponse.json(
        { success: false, error: '차단 해제할 사용자를 지정해주세요' },
        { status: 400 }
      );
    }

    // 차단 기록 찾기
    const block = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: user.id,
          blockedId: blockedUserId,
        },
      },
    });

    if (!block) {
      return NextResponse.json(
        { success: false, error: '차단 기록을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 차단 해제
    await prisma.blockedUser.delete({
      where: {
        blockerId_blockedId: {
          blockerId: user.id,
          blockedId: blockedUserId,
        },
      },
    });

    console.log('[Block Remove] 차단 해제:', user.id, 'unblocked:', blockedUserId);

    return NextResponse.json({
      success: true,
      message: '사용자 차단을 해제했습니다',
    });
  } catch (error) {
    console.error('[Block Remove API] 에러:', error);
    return NextResponse.json(
      { success: false, error: '차단 해제 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
