import { verifyToken, extractToken } from '@/lib/auth';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimiter';

export async function GET(req) {
  try {
    // 속도 제한 확인
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const limitKey = `messages:${ip}`;
    const rateLimit = checkRateLimit(limitKey, 60, 60000);

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

    // URL에서 대화 대상 사용자 ID 추출
    const url = new URL(req.url);
    const recipientId = url.searchParams.get('recipientId');

    if (!recipientId || typeof recipientId !== 'string') {
      return Response.json(
        { success: false, error: '유효한 recipientId가 필요합니다' },
        { status: 400 }
      );
    }

    // 대상 사용자 존재 확인
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true },
    });

    if (!recipient) {
      return Response.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 메시지 조회
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: decoded.userId,
            recipientId: recipientId,
          },
          {
            senderId: recipientId,
            recipientId: decoded.userId,
          },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        content: true,
        senderId: true,
        recipientId: true,
        createdAt: true,
      },
      take: 50,
    });

    console.log('[Messages API] 조회됨:', messages.length, '개의 메시지');

    return Response.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('[Messages API] 에러:', error);
    return Response.json(
      { success: false, error: '메시지 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    // 속도 제한 확인
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const limitKey = `message:post:${ip}`;
    const rateLimit = checkRateLimit(limitKey, 100, 60000);

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

    // 요청 본문 파싱
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return Response.json(
        { success: false, error: '유효하지 않은 요청 형식입니다' },
        { status: 400 }
      );
    }

    const { recipientId, content } = body;

    if (!recipientId || typeof recipientId !== 'string') {
      return Response.json(
        { success: false, error: '유효한 recipientId가 필요합니다' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string') {
      return Response.json(
        { success: false, error: '메시지 내용이 필요합니다' },
        { status: 400 }
      );
    }

    const trimmedContent = content.trim();

    if (trimmedContent.length === 0 || trimmedContent.length > 1000) {
      return Response.json(
        { success: false, error: '메시지는 1~1000자여야 합니다' },
        { status: 400 }
      );
    }

    if (recipientId === decoded.userId) {
      return Response.json(
        { success: false, error: '자신에게 메시지를 보낼 수 없습니다' },
        { status: 400 }
      );
    }

    // 수신자 존재 확인
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true },
    });

    if (!recipient) {
      return Response.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 메시지 생성
    const message = await prisma.message.create({
      data: {
        content: trimmedContent,
        senderId: decoded.userId,
        recipientId: recipientId,
        createdAt: new Date(),
      },
      select: {
        id: true,
        content: true,
        senderId: true,
        recipientId: true,
        createdAt: true,
      },
    });

    console.log('[Messages API] 메시지 생성:', decoded.userId, '->', recipientId);

    return Response.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('[Messages API] 에러:', error);
    return Response.json(
      { success: false, error: '메시지 전송 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
