import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * 두 좌표 사이의 거리 계산 (Haversine formula)
 * @returns 거리 (km)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * GET /api/nearby-users
 * 현재 위치 주변의 사용자 찾기
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const { searchParams } = new URL(req.url);
    const latitude = parseFloat(searchParams.get("latitude") || "0");
    const longitude = parseFloat(searchParams.get("longitude") || "0");
    const radius = parseInt(searchParams.get("radius") || "50"); // 기본 50km
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!latitude || !longitude) {
      return NextResponse.json(
        { success: false, error: "위치 정보가 필요합니다" },
        { status: 400 }
      );
    }

    // 현재 사용자 위치 업데이트
    await db.userLocation.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        latitude,
        longitude,
      },
      update: {
        latitude,
        longitude,
      },
    });

    // 모든 활성 사용자 및 위치 조회
    const allUsers = await db.user.findMany({
      where: {
        id: { not: user.id },
        isActive: true,
        accountStatus: "active",
      },
      select: {
        id: true,
        username: true,
        age: true,
        gender: true,
        mbti: true,
        profileImage: true,
        bio: true,
        region: true,
        location: true,
      },
    });

    // 거리 계산 및 필터링
    const nearbyUsers = allUsers
      .map((u) => {
        if (!u.location) {
          return null;
        }

        const distance = calculateDistance(
          latitude,
          longitude,
          u.location.latitude,
          u.location.longitude
        );

        if (distance > radius) {
          return null;
        }

        return {
          ...u,
          distance: Math.round(distance * 10) / 10, // 소수점 첫 자리
        };
      })
      .filter((u) => u !== null)
      .sort((a, b) => (a?.distance || 0) - (b?.distance || 0))
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: nearbyUsers,
      meta: {
        count: nearbyUsers.length,
        radius,
        userLocation: { latitude, longitude },
      },
    });
  } catch (error) {
    console.error("[Nearby Users API] GET 에러:", error);
    return NextResponse.json(
      { success: false, error: "주변 사용자 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/nearby-users
 * 현재 위치 업데이트
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();

    const { latitude, longitude } = body;

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: "위치 정보가 필요합니다" },
        { status: 400 }
      );
    }

    const location = await db.userLocation.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        latitude,
        longitude,
      },
      update: {
        latitude,
        longitude,
      },
    });

    return NextResponse.json({
      success: true,
      data: location,
      message: "위치가 업데이트되었습니다",
    });
  } catch (error) {
    console.error("[Nearby Users API] POST 에러:", error);
    return NextResponse.json(
      { success: false, error: "위치 업데이트에 실패했습니다" },
      { status: 500 }
    );
  }
}
