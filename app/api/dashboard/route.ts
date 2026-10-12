import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCache, setCache, deleteCache } from "@/lib/cache";
import { getUnreadNotificationCount } from "@/lib/notificationService";

/**
 * GET /api/dashboard
 * 사용자 대시보드 통계 (좋아요, 매칭, 메시지 등)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    // 캐시 확인 (1분)
    const cacheKey = `dashboard:${user.id}`;
    const cached = getCache(cacheKey);

    if (cached) {
      console.log("[Dashboard API] 캐시에서 반환됨:", cacheKey);
      return NextResponse.json(cached);
    }

    // 사용자 정보
    const userData = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        email: true,
        age: true,
        gender: true,
        region: true,
        mbti: true,
        bio: true,
        profileImage: true,
        points: true,
        createdAt: true,
        emailVerified: true,
        photoVerified: true,
      },
    });

    if (!userData) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 받은 좋아요 개수
    const receivedLikesCount = await db.like.count({
      where: {
        toUserId: user.id,
        liked: true,
      },
    });

    // 보낸 좋아요 개수
    const sentLikesCount = await db.like.count({
      where: {
        fromUserId: user.id,
        liked: true,
      },
    });

    // 매칭 개수
    const matchesCount = await db.match.count({
      where: {
        isActive: true,
        OR: [{ userAId: user.id }, { userBId: user.id }],
      },
    });

    // 메시지 통계
    const sentMessagesCount = await db.message.count({
      where: { senderId: user.id },
    });

    const receivedMessagesCount = await db.message.count({
      where: { recipientId: user.id },
    });

    // 읽지 않은 메시지 개수
    const unreadMessagesCount = await db.message.count({
      where: {
        recipientId: user.id,
        isRead: false,
      },
    });

    // 읽지 않은 알림 개수
    const unreadNotificationsCount = await getUnreadNotificationCount(user.id);

    // 신고 통계
    const reportedCount = await db.report.count({
      where: { reportedUserId: user.id },
    });

    // 차단된 사용자 개수
    const blockedUsersCount = await db.blockedUser.count({
      where: { blockerId: user.id },
    });

    // 가입 후 경과 일수
    const accountAgeDays = Math.floor(
      (Date.now() - userData.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 대시보드 데이터
    const dashboardData = {
      profile: userData,
      stats: {
        receivedLikesCount,
        sentLikesCount,
        matchesCount,
        sentMessagesCount,
        receivedMessagesCount,
        unreadMessagesCount,
        unreadNotificationsCount,
        reportedCount,
        blockedUsersCount,
        accountAgeDays,
      },
      engagement: {
        profileCompletion: calculateProfileCompletion(userData),
        activityLevel: calculateActivityLevel({
          sentLikesCount,
          matchesCount,
          sentMessagesCount,
          accountAgeDays,
        }),
      },
    };

    const response = {
      success: true,
      data: dashboardData,
    };

    // 캐시에 저장 (1분)
    setCache(cacheKey, response, 60);

    console.log("[Dashboard API] 대시보드 조회됨:", user.id);

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Dashboard API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "대시보드 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * 프로필 완성도 계산 (0-100)
 */
function calculateProfileCompletion(userData: any): number {
  let completionScore = 0;
  const totalFields = 8;

  if (userData.username) completionScore++;
  if (userData.email) completionScore++;
  if (userData.age) completionScore++;
  if (userData.gender) completionScore++;
  if (userData.region) completionScore++;
  if (userData.mbti) completionScore++;
  if (userData.bio) completionScore++;
  if (userData.profileImage) completionScore++;

  return Math.round((completionScore / totalFields) * 100);
}

/**
 * 활동 수준 계산 (0-100)
 */
function calculateActivityLevel(stats: any): number {
  const { sentLikesCount, matchesCount, sentMessagesCount, accountAgeDays } =
    stats;

  // 일일 활동 지수
  const dailyActivity =
    (sentLikesCount + matchesCount * 3 + sentMessagesCount) /
    Math.max(1, accountAgeDays);

  // 0-100 범위로 정규화
  const activityScore = Math.min(100, dailyActivity * 10);

  return Math.round(activityScore);
}

/**
 * POST /api/dashboard/refresh
 * 캐시 새로고침
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);

    // 캐시 삭제
    const cacheKey = `dashboard:${user.id}`;
    deleteCache(cacheKey);

    console.log("[Dashboard API] 캐시 새로고침:", cacheKey);

    return NextResponse.json(
      { success: true, message: "캐시가 새로고쳐졌습니다" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Dashboard API] 새로고침 에러:", error);
    return NextResponse.json(
      { success: false, error: "캐시 새로고침 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
