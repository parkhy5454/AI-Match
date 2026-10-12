import { verifyToken, extractToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimiter';

export async function POST(req) {
  try {
    // 속도 제한 확인
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const limitKey = `logout:${ip}`;
    const rateLimit = checkRateLimit(limitKey, 20, 60000);

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

    // 로그아웃 처리 (클라이언트에서 localStorage 토큰 제거)
    console.log('[Logout API] 로그아웃:', decoded.userId);

    return Response.json(
      {
        success: true,
        message: '로그아웃 성공',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Logout API] 에러:', error);
    return Response.json(
      { success: false, error: '로그아웃 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
