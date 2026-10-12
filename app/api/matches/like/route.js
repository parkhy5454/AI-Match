import { verifyToken, extractToken } from '@/lib/auth';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimiter';

export async function POST(req) {
  try {
    // 속도 제한 확인
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const limitKey = `like:${ip}`;
    const rateLimit = checkRateLimit(limitKey, 50, 60000); // 분당 50회

    if (!rateLimit.allowed) {
      return Response.json(
        {
          success: false,
          error: '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.',
        },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
      );
    }

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

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return Response.json(
        { success: false, error: '유효하지 않은 요청 형식입니다' },
        { status: 400 }
      );
    }

    const { targetUserId, liked } = body;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return Response.json(
        { success: false, error: '유효한 대상 사용자가 필요합니다' },
        { status: 400 }
      );
    }

    // 자신을 좋아할 수 없음
    if (targetUserId === decoded.userId) {
      return Response.json(
        { success: false, error: '자신을 좋아할 수 없습니다' },
        { status: 400 }
      );
    }

    // liked 값이 boolean인지 확인
    if (typeof liked !== 'boolean') {
      return Response.json(
        { success: false, error: 'liked는 boolean 값이어야 합니다' },
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

    // Create or update like
    await prisma.like.upsert({
      where: {
        fromUserId_toUserId: {
          fromUserId: decoded.userId,
          toUserId: targetUserId,
        },
      },
      update: {
        liked,
      },
      create: {
        fromUserId: decoded.userId,
        toUserId: targetUserId,
        liked,
      },
    });

    // Check for mutual like (match)
    if (liked) {
      const mutualLike = await prisma.like.findUnique({
        where: {
          fromUserId_toUserId: {
            fromUserId: targetUserId,
            toUserId: decoded.userId,
          },
        },
      });

      if (mutualLike && mutualLike.liked) {
        // Create match
        await prisma.match.upsert({
          where: {
            userId_matchedUserId: {
              userId: decoded.userId,
              matchedUserId: targetUserId,
            },
          },
          update: {},
          create: {
            userId: decoded.userId,
            matchedUserId: targetUserId,
          },
        });

        return Response.json({
          success: true,
          data: { match: true },
          message: '매칭 성공!',
        });
      }
    }

    return Response.json({
      success: true,
      data: { match: false },
      message: liked ? '좋아요를 눌렀습니다' : 'Pass 했습니다',
    });
  } catch (error) {
    console.error('[Like API] 에러:', error);
    return Response.json(
      { success: false, error: '좋아요 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
