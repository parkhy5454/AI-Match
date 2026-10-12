import { verifyToken, extractToken } from '@/lib/auth';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimiter';
import { parsePaginationParams, createPaginationMeta, formatPaginatedResponse } from '@/lib/pagination';
import { getCache, setCache } from '@/lib/cache';

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

    // 캐시 확인
    const url = new URL(req.url);
    const page = url.searchParams.get('page') || '1';
    const limit = url.searchParams.get('limit') || '20';
    const cacheKey = `conversations:${decoded.userId}:${page}:${limit}`;
    const cached = getCache(cacheKey);

    if (cached) {
      console.log('[Conversations API] 캐시에서 반환됨:', cacheKey);
      return Response.json(cached);
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

    // 최적화: 한 번의 쿼리로 모든 최신 메시지 가져오기
    const lastMessages = await prisma.message.findMany({
      where: {
        OR: conversationIds.map(userId => ({
          OR: [
            { senderId: decoded.userId, recipientId: userId },
            { senderId: userId, recipientId: decoded.userId }
          ]
        }))
      },
      distinct: ['senderId', 'recipientId'],
      orderBy: { createdAt: 'desc' },
      select: {
        senderId: true,
        recipientId: true,
        content: true,
        createdAt: true,
      }
    });

    // 메시지 맵 생성 (lookup 최적화)
    const messageMap = new Map();
    lastMessages.forEach(msg => {
      const otherUserId = msg.senderId === decoded.userId ? msg.recipientId : msg.senderId;
      if (!messageMap.has(otherUserId)) {
        messageMap.set(otherUserId, msg);
      }
    });

    // 대화 상세 정보 구성
    let conversationDetails = users.map(user => {
      const lastMessage = messageMap.get(user.id);
      return {
        id: user.id,
        username: user.username,
        profileImage: user.profileImage,
        lastMessage: lastMessage?.content || '메시지 시작',
        lastMessageAt: lastMessage?.createdAt
      };
    }).sort((a, b) => {
      // 최신 메시지 순서로 정렬
      const timeA = a.lastMessageAt?.getTime() || 0;
      const timeB = b.lastMessageAt?.getTime() || 0;
      return timeB - timeA;
    });

    // 페이지네이션 적용
    const { skip, take } = parsePaginationParams({ page, limit });
    const total = conversationDetails.length;
    const paginatedConversations = conversationDetails.slice(skip, skip + take);

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const meta = createPaginationMeta(pageNum, limitNum, total);

    const response = formatPaginatedResponse(paginatedConversations, meta);

    // 캐시에 저장 (5분)
    setCache(cacheKey, response, 300);

    console.log('[Conversations API] 조회됨:', paginatedConversations.length, '개의 대화');

    return Response.json(response);
  } catch (error) {
    console.error('[Conversations API] 에러:', error);
    return Response.json(
      { success: false, error: '대화 목록 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
