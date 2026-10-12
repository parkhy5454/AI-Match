import { verifyToken, extractToken } from '@/lib/auth';
import prisma from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimiter';
import { validateAge as validateAgeUtil, validateRegion as validateRegionUtil, validateMBTI as validateMBTIUtil } from '@/lib/validation';

export async function POST(req) {
  try {
    // 속도 제한 확인
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const limitKey = `search:${ip}`;
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

    // 검색 조건 파싱
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return Response.json(
        { success: false, error: '유효하지 않은 요청 형식입니다' },
        { status: 400 }
      );
    }

    const { keyword = '', minAge = '', maxAge = '', region = '', mbti = '' } = body;

    // 입력값 검증
    const whereConditions = {
      id: { not: decoded.userId },
      isPrivate: false, // 공개 프로필만 검색
    };

    if (minAge) {
      const ageValidation = validateAgeUtil(minAge);
      if (!ageValidation.valid) {
        return Response.json(
          { success: false, error: '유효하지 않은 최소 나이입니다' },
          { status: 400 }
        );
      }
      whereConditions.age = { gte: parseInt(minAge) };
    }

    if (maxAge) {
      const ageValidation = validateAgeUtil(maxAge);
      if (!ageValidation.valid) {
        return Response.json(
          { success: false, error: '유효하지 않은 최대 나이입니다' },
          { status: 400 }
        );
      }
      whereConditions.age = whereConditions.age || {};
      whereConditions.age.lte = parseInt(maxAge);
    }

    if (region) {
      const regionValidation = validateRegionUtil(region);
      if (!regionValidation.valid) {
        return Response.json(
          { success: false, error: regionValidation.error },
          { status: 400 }
        );
      }
      whereConditions.region = region.trim();
    }

    if (mbti) {
      const mbtiValidation = validateMBTIUtil(mbti);
      if (!mbtiValidation.valid) {
        return Response.json(
          { success: false, error: mbtiValidation.error },
          { status: 400 }
        );
      }
      whereConditions.mbti = mbti.toUpperCase();
    }

    if (keyword) {
      if (keyword.length > 50) {
        return Response.json(
          { success: false, error: '검색어는 50자 이하여야 합니다' },
          { status: 400 }
        );
      }
      whereConditions.OR = [
        { username: { contains: keyword, mode: 'insensitive' } },
        { bio: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    // 데이터베이스에서 사용자 검색
    const users = await prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        username: true,
        age: true,
        region: true,
        mbti: true,
        bio: true,
        profileImage: true,
      },
      take: 50,
    });

    console.log('[Search API] 검색 결과:', users.length, '명');

    return Response.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('[Search API] 에러:', error);
    return Response.json(
      { success: false, error: '검색 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
