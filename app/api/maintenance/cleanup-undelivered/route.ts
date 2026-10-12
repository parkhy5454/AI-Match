/**
 * POST /api/maintenance/cleanup-undelivered
 * 미배달 메시지 및 온라인 상태 정리
 *
 * 보안: API_SECRET 환경 변수로 보호
 * cron 서비스나 내부 스크립트에서만 호출 가능
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMaintenanceSecret(request: NextRequest) {
  const secret = request.headers.get('X-API-Secret');
  const expectedSecret = process.env.API_SECRET || process.env.MAINTENANCE_SECRET;

  if (!expectedSecret) {
    // 환경 변수가 없으면 개발 환경에서만 허용
    return process.env.NODE_ENV === 'development';
  }

  return secret === expectedSecret;
}

/**
 * 7일 이상 된 미배달 메시지 삭제
 */
async function cleanupOldMessages(daysOld: number = 7) {
  try {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const [deleted1to1, deletedGroup] = await Promise.all([
      prisma.undeliveredMessage.deleteMany({
        where: {
          queuedAt: { lt: cutoffDate },
        },
      }),
      prisma.undeliveredGroupMessage.deleteMany({
        where: {
          queuedAt: { lt: cutoffDate },
        },
      }),
    ]);

    console.log(
      `[Maintenance] Cleanup: Deleted ${deleted1to1.count} 1:1 and ${deletedGroup.count} group messages older than ${daysOld} days`
    );

    return {
      deleted1to1: deleted1to1.count,
      deletedGroup: deletedGroup.count,
    };
  } catch (error) {
    console.error('[Maintenance] Cleanup error:', error);
    throw error;
  }
}

/**
 * 배달 실패 메시지 재시도
 */
async function retryFailedDeliveries() {
  try {
    // 5회 미만 시도했고 마지막 시도가 5분 이상 전인 메시지
    const retryable = await prisma.undeliveredMessage.updateMany({
      where: {
        isDelivered: false,
        deliveryAttempts: { lt: 5 },
        lastAttemptAt: {
          lt: new Date(Date.now() - 5 * 60 * 1000),
        },
      },
      data: {
        lastAttemptAt: new Date(),
        deliveryAttempts: { increment: 1 },
      },
    });

    console.log(`[Maintenance] Retry: Updated ${retryable.count} failed delivery records`);

    return retryable.count;
  } catch (error) {
    console.error('[Maintenance] Retry error:', error);
    throw error;
  }
}

/**
 * 온라인 상태 동기화 - 오래된 항목 정리
 */
async function cleanupOnlineStatus(minutesAgo: number = 1440) {
  // 기본값: 24시간
  try {
    const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);

    // 24시간 이상 마지막 상태가 업데이트되지 않은 사용자 정리
    const updated = await prisma.onlineStatus.deleteMany({
      where: {
        updatedAt: { lt: cutoffTime },
        isOnline: false, // 오프라인 상태인 항목만 삭제
      },
    });

    console.log(
      `[Maintenance] OnlineStatus: Deleted ${updated.count} stale offline records (older than ${minutesAgo} minutes)`
    );

    return updated.count;
  } catch (error) {
    console.error('[Maintenance] OnlineStatus cleanup error:', error);
    throw error;
  }
}

/**
 * 통계 수집
 */
async function getCleanupStats() {
  try {
    const [totalUndelivered1to1, totalUndeliveredGroup, totalOnlineStatuses] = await Promise.all([
      prisma.undeliveredMessage.count(),
      prisma.undeliveredGroupMessage.count(),
      prisma.onlineStatus.count(),
    ]);

    const [undeliveredByAge] = await Promise.all([
      prisma.undeliveredMessage.groupBy({
        by: ['isDelivered'],
        _count: true,
      }),
    ]);

    return {
      totalUndelivered1to1,
      totalUndeliveredGroup,
      totalOnlineStatuses,
      undeliveredByDeliveryStatus: undeliveredByAge,
    };
  } catch (error) {
    console.error('[Maintenance] Stats error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 보안 검증
    const isAuthorized = await verifyMaintenanceSecret(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 요청 본문에서 옵션 파싱
    let options = { cleanupDays: 7, retryFailed: true, cleanupOnlineStatus: true };
    try {
      const body = await request.json();
      options = { ...options, ...body };
    } catch {
      // JSON 파싱 실패 시 기본값 사용
    }

    const startTime = Date.now();
    const results: Record<string, any> = {};

    // 통계 수집
    const statsBefore = await getCleanupStats();
    results.statsBefore = statsBefore;

    // 오래된 메시지 정리
    results.cleanup = await cleanupOldMessages(options.cleanupDays);

    // 배달 실패 메시지 재시도
    if (options.retryFailed) {
      results.retried = await retryFailedDeliveries();
    }

    // 온라인 상태 정리
    if (options.cleanupOnlineStatus) {
      results.cleanedOnlineStatus = await cleanupOnlineStatus();
    }

    // 최종 통계
    const statsAfter = await getCleanupStats();
    results.statsAfter = statsAfter;

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      results,
    });
  } catch (error) {
    console.error('[Maintenance] Cleanup endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/maintenance/cleanup-undelivered
 * 통계만 조회 (실행 안 함)
 */
export async function GET(request: NextRequest) {
  try {
    const isAuthorized = await verifyMaintenanceSecret(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getCleanupStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Maintenance] Stats endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
