import { verifyToken, extractToken } from '@/lib/auth';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimiter';

export async function GET(req) {
  try {
    // 속도 제한 확인
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const limitKey = `conversations:${ip}`;
    const rateLimit = checkRateLimit(limitKey, 30, 60000);

    if (!rateLimit.allowed) {
      return Response.json(
        {
          success: false,
          error: '너무 많은 요청을 보냈습니다.',
        },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
      );
    }

    // 토큰 검증
    const token = extractToken(req);

    if (!token) {
      return Response.json(
        { success: false, error: '토큰이 없습니다' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return Response.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      );
    }

    // 현재 사용자가 보낸 메시지 또는 받은 메시지가 있는 사용자들 조회
    const conversations = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: decoded.userId },
          { recipientId: decoded.userId }
        ]
      },
      distinct: ['senderId', 'recipientId'],
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 대화 상대 정보 조회
    const conversationIds = new Set();
    conversations.forEach(msg => {
      if (msg.senderId === decoded.userId) {
        conversationIds.add(msg.recipientId);
      } else {
        conversationIds.add(msg.senderId);
      }
    });

    const users = await prisma.user.findMany({
      where: {
        id: { in: Array.from(conversationIds) }
      },
      select: {
        id: true,
        username: true,
        profileImage: true
      }
    });

    // 각 대화의 최신 메시지 조회
    const conversationDetails = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: decoded.userId, recipientId: user.id },
              { senderId: user.id, recipientId: decoded.userId }
            ]
          },
          orderBy: { createdAt: 'desc' },
          select: {
            content: true,
            createdAt: true,
          }
        });

        return {
          id: user.id,
          username: user.username,
          profileImage: user.profileImage,
          lastMessage: lastMessage?.content || '메시지 시작',
          lastMessageAt: lastMessage?.createdAt
        };
      })
    );

    console.log('[Conversations API] 조회됨:', conversationDetails.length, '개의 대화');

    return Response.json({
      success: true,
      data: conversationDetails,
    });
  } catch (error) {
    console.error('[Conversations API] 에러:', error);
    return Response.json(
      { success: false, error: '대화 목록 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
