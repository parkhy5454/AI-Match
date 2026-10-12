/**
 * GET /api/messages/undelivered - 미배달 메시지 조회
 * POST /api/messages/undelivered/mark-delivered - 메시지를 배달됨으로 표시
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

async function verifyAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.slice(7);
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as { userId: string };
  } catch (error) {
    return null;
  }
}

/**
 * GET /api/messages/undelivered
 * 현재 사용자의 미배달 메시지 조회
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = request.nextUrl.searchParams.get('limit') || '50';
    const limitNum = Math.min(parseInt(limit), 200);

    // 미배달 1:1 메시지
    const undeliveredMessages = await prisma.undeliveredMessage.findMany({
      where: {
        recipientId: auth.userId,
        isDelivered: false,
      },
      orderBy: { queuedAt: 'asc' },
      take: limitNum,
      select: {
        id: true,
        messageId: true,
        senderId: true,
        content: true,
        queuedAt: true,
        deliveryAttempts: true,
      },
    });

    // 미배달 그룹 메시지
    const undeliveredGroupMessages = await prisma.undeliveredGroupMessage.findMany({
      where: {
        userId: auth.userId,
        isDelivered: false,
      },
      orderBy: { queuedAt: 'asc' },
      take: limitNum,
      select: {
        id: true,
        groupMessageId: true,
        roomId: true,
        content: true,
        senderName: true,
        queuedAt: true,
        deliveryAttempts: true,
      },
    });

    // 통계
    const stats = {
      undelivered1to1Count: undeliveredMessages.length,
      undeliveredGroupCount: undeliveredGroupMessages.length,
      totalUndelivered: undeliveredMessages.length + undeliveredGroupMessages.length,
    };

    return NextResponse.json({
      success: true,
      stats,
      messages: {
        direct: undeliveredMessages,
        group: undeliveredGroupMessages,
      },
    });
  } catch (error) {
    console.error('[API] Undelivered messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch undelivered messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages/undelivered/mark-delivered
 * 미배달 메시지를 배달됨으로 표시
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageIds = [], groupMessageIds = [] } = body;

    if (messageIds.length === 0 && groupMessageIds.length === 0) {
      return NextResponse.json({ error: 'No message IDs provided' }, { status: 400 });
    }

    let updated1to1 = 0;
    let updatedGroup = 0;

    // 1:1 메시지 업데이트
    if (messageIds.length > 0) {
      const result = await prisma.undeliveredMessage.updateMany({
        where: {
          id: { in: messageIds },
          recipientId: auth.userId,
        },
        data: {
          isDelivered: true,
          deliveredAt: new Date(),
        },
      });
      updated1to1 = result.count;
    }

    // 그룹 메시지 업데이트
    if (groupMessageIds.length > 0) {
      const result = await prisma.undeliveredGroupMessage.updateMany({
        where: {
          id: { in: groupMessageIds },
          userId: auth.userId,
        },
        data: {
          isDelivered: true,
          deliveredAt: new Date(),
        },
      });
      updatedGroup = result.count;
    }

    return NextResponse.json({
      success: true,
      updated: {
        direct: updated1to1,
        group: updatedGroup,
        total: updated1to1 + updatedGroup,
      },
    });
  } catch (error) {
    console.error('[API] Mark delivered error:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as delivered' },
      { status: 500 }
    );
  }
}
