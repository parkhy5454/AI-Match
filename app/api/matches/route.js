import { verifyToken, extractToken } from '@/lib/auth';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimiter';

export async function GET(req) {
  try {
    // 속도 제한 확인
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const limitKey = `matches:${ip}`;
    const rateLimit = checkRateLimit(limitKey, 30, 60000); // 분당 30회

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

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        region: true,
        isPrivate: true,
      },
    });

    if (!currentUser) {
      return Response.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // Get potential matches (same region)
    const potentialMatches = await prisma.user.findMany({
      where: {
        id: { not: decoded.userId },
        region: currentUser.region,
        isPrivate: false, // 공개 프로필만 표시
      },
      select: {
        id: true,
        username: true,
        age: true,
        region: true,
        mbti: true,
        bio: true,
        profileImage: true,
      },
      take: 10,
    });

    return Response.json({
      success: true,
      matches: potentialMatches,
    });
  } catch (error) {
    console.error('[Matches API] 에러:', error);
    return Response.json(
      { success: false, error: '매칭 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
