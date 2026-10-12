import { NextResponse, NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import prisma from '@/lib/db';

/**
 * 메시지 읽음 상태 업데이트
 * POST /api/messages/read-status
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

    const { messageIds, conversationId } = body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '메시지 ID가 필요합니다' },
        { status: 400 }
      );
    }

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: '대화 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 대화 권한 확인
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        user1Id: true,
        user2Id: true,
      },
    });

    if (!conversation || (conversation.user1Id !== user.id && conversation.user2Id !== user.id)) {
      return NextResponse.json(
        { success: false, error: '이 대화에 접근할 수 없습니다' },
        { status: 403 }
      );
    }

    // 메시지 읽음 상태 업데이트
    const result = await prisma.messageReadStatus.updateMany({
      where: {
        messageId: { in: messageIds },
        readerId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    console.log('[Message Read Status] 업데이트:', user.id, '메시지:', result.count);

    return NextResponse.json({
      success: true,
      data: {
        readCount: result.count,
      },
      message: `${result.count}개의 메시지를 읽음으로 표시했습니다`,
    });
  } catch (error) {
    console.error('[Message Read Status API] 에러:', error);
    return NextResponse.json(
      { success: false, error: '읽음 상태 업데이트 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * 메시지 읽음 상태 조회
 * GET /api/messages/read-status?conversationId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const conversationId = req.nextUrl.searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: '대화 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 대화 권한 확인
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        user1Id: true,
        user2Id: true,
      },
    });

    if (!conversation || (conversation.user1Id !== user.id && conversation.user2Id !== user.id)) {
      return NextResponse.json(
        { success: false, error: '이 대화에 접근할 수 없습니다' },
        { status: 403 }
      );
    }

    // 읽지 않은 메시지 조회
    const unreadCount = await prisma.messageReadStatus.count({
      where: {
        message: { conversationId },
        readerId: user.id,
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    console.error('[Message Read Status GET] 에러:', error);
    return NextResponse.json(
      { success: false, error: '읽음 상태 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
