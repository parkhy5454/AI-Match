import { NextResponse, NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import prisma from '@/lib/db';

/**
 * 사용자 차단
 * POST /api/block/create
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

    const { blockedUserId, reason } = body;

    // 필수 필드 검증
    if (!blockedUserId) {
      return NextResponse.json(
        { success: false, error: '차단할 사용자를 지정해주세요' },
        { status: 400 }
      );
    }

    // 자신을 차단할 수 없음
    if (blockedUserId === user.id) {
      return NextResponse.json(
        { success: false, error: '자신을 차단할 수 없습니다' },
        { status: 400 }
      );
    }

    // 차단 대상 존재 확인
    const blockedUser = await prisma.user.findUnique({
      where: { id: blockedUserId },
      select: { id: true },
    });

    if (!blockedUser) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 이미 차단했는지 확인
    const existingBlock = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: user.id,
          blockedId: blockedUserId,
        },
      },
    });

    if (existingBlock) {
      return NextResponse.json(
        { success: false, error: '이미 차단한 사용자입니다' },
        { status: 400 }
      );
    }

    // 차단 생성
    const block = await prisma.blockedUser.create({
      data: {
        blockerId: user.id,
        blockedId: blockedUserId,
        reason: reason ? String(reason).trim().slice(0, 200) : null,
      },
    });

    // 차단된 사용자와의 대화 삭제 (또는 숨김)
    // 선택사항: 기존 메시지 삭제 또는 대화 삭제
    // await prisma.message.deleteMany({
    //   where: {
    //     OR: [
    //       { conversationId: { /* blocked user conversation */ } },
    //     ],
    //   },
    // });

    console.log('[Block Create] 차단 생성:', block.id, 'blocker:', user.id, 'blocked:', blockedUserId);

    return NextResponse.json({
      success: true,
      data: { blockId: block.id },
      message: '사용자를 차단했습니다',
    });
  } catch (error) {
    console.error('[Block Create API] 에러:', error);
    return NextResponse.json(
      { success: false, error: '차단 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
