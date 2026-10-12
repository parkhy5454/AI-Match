import { NextResponse, NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import prisma from '@/lib/db';
import { calculateDistance, isValidCoordinates } from '@/lib/locationUtils';

/**
 * 주변 사용자 조회 (위치 기반)
 * POST /api/location/nearby
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

    const { latitude, longitude, maxDistance = 10, limit = 20 } = body;

    // 필수 필드 검증
    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: '위치 정보가 필요합니다' },
        { status: 400 }
      );
    }

    // 좌표 검증
    if (!isValidCoordinates(latitude, longitude)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 좌표입니다' },
        { status: 400 }
      );
    }

    // 거리 검증
    if (maxDistance < 1 || maxDistance > 100) {
      return NextResponse.json(
        { success: false, error: '거리는 1-100km 범위여야 합니다' },
        { status: 400 }
      );
    }

    // 사용자 위치 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        lastLocationUpdate: new Date(),
      },
    });

    // 주변 사용자 조회
    const nearbyUsers = await prisma.user.findMany({
      where: {
        id: { not: user.id },
        isActive: true,
        accountStatus: 'active',
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        username: true,
        age: true,
        region: true,
        mbti: true,
        profileImage: true,
        latitude: true,
        longitude: true,
        photoVerified: true,
      },
      take: limit,
    });

    // 거리 계산 및 필터링
    const usersWithDistance = nearbyUsers
      .map((u) => ({
        ...u,
        distance: calculateDistance(
          { latitude, longitude },
          { latitude: u.latitude!, longitude: u.longitude! }
        ),
      }))
      .filter((u) => u.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    console.log('[Location Nearby] 조회 완료:', user.id, '거리:', maxDistance, '명:', usersWithDistance.length);

    return NextResponse.json({
      success: true,
      data: {
        users: usersWithDistance,
        count: usersWithDistance.length,
      },
      message: `${usersWithDistance.length}명의 사용자를 찾았습니다`,
    });
  } catch (error) {
    console.error('[Location Nearby API] 에러:', error);
    return NextResponse.json(
      { success: false, error: '주변 사용자 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
