import { verifyToken, extractToken } from '@/lib/auth';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimiter';

export async function POST(req) {
  try {
    // 속도 제한 확인
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const limitKey = `like:post:${ip}`;
    const rateLimit = checkRateLimit(limitKey, 50, 60000);

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

    const { targetUserId } = body;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return Response.json(
        { success: false, error: '유효한 targetUserId가 필요합니다' },
        { status: 400 }
      );
    }

    if (targetUserId === decoded.userId) {
      return Response.json(
        { success: false, error: '자신을 좋아할 수 없습니다' },
        { status: 400 }
      );
    }

    // 대상 사용자 존재 확인
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      return Response.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 이미 좋아요 했는지 확인
    const existingLike = await prisma.like.findFirst({
      where: {
        fromUserId: decoded.userId,
        toUserId: targetUserId,
      },
    });

    if (existingLike) {
      return Response.json(
        { success: false, error: '이미 좋아요를 누른 사용자입니다' },
        { status: 400 }
      );
    }

    // 좋아요 생성
    await prisma.like.create({
      data: {
        fromUserId: decoded.userId,
        toUserId: targetUserId,
        createdAt: new Date(),
      },
    });

    console.log('[Likes API] 좋아요 생성:', decoded.userId, '->', targetUserId);

    return Response.json({
      success: true,
      message: '좋아요가 전송되었습니다!',
    });
  } catch (error) {
    console.error('[Likes API] 에러:', error);
    return Response.json(
      { success: false, error: '좋아요 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
