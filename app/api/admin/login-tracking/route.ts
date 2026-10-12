import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getLoginStatistics,
  getRecentFailedAttempts,
  getLastSuccessfulLogin
} from "@/lib/loginTracking";
import { db } from "@/lib/db";

/**
 * GET /api/admin/login-tracking
 * 로그인 추적 및 보안 통계 조회 (관리자용)
 */
export async function GET(req: NextRequest) {
  try {
    // 인증 확인 (관리자만 접근 가능)
    const user = await requireUser(req);

    // TODO: 관리자 역할 확인 (현재는 인증된 모든 사용자 허용)

    // 로그인 통계 조회
    const stats = await getLoginStatistics(7);

    // 최근 실패한 로그인 시도 조회
    const recentFailures = await db.loginAttempt.findMany({
      where: {
        success: false,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24시간
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    // 실패 원인별 통계
    const failureReasons = await db.loginAttempt.groupBy({
      by: ['reason'],
      where: {
        success: false,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7일
        },
      },
      _count: true,
    });

    // IP별 실패 횟수 상위 10
    const suspiciousIPs = await db.loginAttempt.groupBy({
      by: ['ipAddress'],
      where: {
        success: false,
        ipAddress: { not: null },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24시간
        },
      },
      _count: true,
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        statistics: stats,
        recentFailures: recentFailures.map(attempt => ({
          email: attempt.email,
          ipAddress: attempt.ipAddress,
          reason: attempt.reason,
          createdAt: attempt.createdAt,
        })),
        failureReasons,
        suspiciousIPs: suspiciousIPs.map(ip => ({
          ipAddress: ip.ipAddress,
          failureCount: ip._count,
        })),
      },
      message: "로그인 통계 조회 성공",
    });
  } catch (error) {
    console.error("[Login Tracking API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "로그인 통계 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/login-tracking/check-user
 * 특정 사용자의 로그인 시도 기록 조회
 */
export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const user = await requireUser(req);

    const body = await req.json();
    const { email, days = 7 } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "이메일을 입력해주세요" },
        { status: 400 }
      );
    }

    // 해당 이메일의 로그인 시도 기록 조회
    const timeFrame = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const attempts = await db.loginAttempt.findMany({
      where: {
        email,
        createdAt: {
          gte: timeFrame,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 최근 실패 횟수
    const recentFailures = await getRecentFailedAttempts(email, 15);

    // 마지막 성공한 로그인
    const lastSuccess = await getLastSuccessfulLogin(email);

    return NextResponse.json({
      success: true,
      data: {
        email,
        totalAttempts: attempts.length,
        successAttempts: attempts.filter(a => a.success).length,
        failedAttempts: attempts.filter(a => !a.success).length,
        recentFailures15m: recentFailures,
        lastSuccessfulLogin: lastSuccess?.createdAt || null,
        attempts: attempts.map(a => ({
          success: a.success,
          reason: a.reason,
          ipAddress: a.ipAddress,
          userAgent: a.userAgent,
          createdAt: a.createdAt,
        })),
      },
      message: "사용자 로그인 기록 조회 성공",
    });
  } catch (error) {
    console.error("[Login Check API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "사용자 로그인 기록 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
