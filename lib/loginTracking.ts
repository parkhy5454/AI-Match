import { db } from "@/lib/db";

// 로그인 실패 기록 저장
export async function recordLoginAttempt(
  email: string,
  ipAddress: string | null,
  userAgent: string | null,
  success: boolean,
  reason?: string
) {
  try {
    await db.loginAttempt.create({
      data: {
        email,
        ipAddress,
        userAgent,
        success,
        reason: reason || (success ? undefined : "failed"),
      },
    });
  } catch (error) {
    console.error("로그인 시도 기록 저장 실패:", error);
  }
}

// 특정 이메일의 최근 로그인 실패 횟수 확인 (최근 15분)
export async function getRecentFailedAttempts(
  email: string,
  minutesBack: number = 15
): Promise<number> {
  try {
    const timeFrame = new Date(Date.now() - minutesBack * 60 * 1000);
    const count = await db.loginAttempt.count({
      where: {
        email,
        success: false,
        createdAt: {
          gte: timeFrame,
        },
      },
    });
    return count;
  } catch (error) {
    console.error("실패한 로그인 시도 조회 실패:", error);
    return 0;
  }
}

// 특정 IP의 최근 로그인 실패 횟수 확인 (최근 15분)
export async function getRecentFailedAttemptsByIP(
  ipAddress: string,
  minutesBack: number = 15
): Promise<number> {
  try {
    const timeFrame = new Date(Date.now() - minutesBack * 60 * 1000);
    const count = await db.loginAttempt.count({
      where: {
        ipAddress,
        success: false,
        createdAt: {
          gte: timeFrame,
        },
      },
    });
    return count;
  } catch (error) {
    console.error("IP별 실패한 로그인 시도 조회 실패:", error);
    return 0;
  }
}

// 특정 이메일의 성공한 로그인 최근 기록 조회
export async function getLastSuccessfulLogin(email: string) {
  try {
    const lastLogin = await db.loginAttempt.findFirst({
      where: {
        email,
        success: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return lastLogin;
  } catch (error) {
    console.error("마지막 로그인 조회 실패:", error);
    return null;
  }
}

// 로그인 시도 통계 조회 (관리자용)
export async function getLoginStatistics(days: number = 7) {
  try {
    const timeFrame = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const totalAttempts = await db.loginAttempt.count({
      where: {
        createdAt: {
          gte: timeFrame,
        },
      },
    });

    const successfulAttempts = await db.loginAttempt.count({
      where: {
        success: true,
        createdAt: {
          gte: timeFrame,
        },
      },
    });

    const failedAttempts = totalAttempts - successfulAttempts;
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      successRate: Math.round(successRate * 100) / 100,
      period: `${days}일`,
    };
  } catch (error) {
    console.error("로그인 통계 조회 실패:", error);
    return null;
  }
}

// 의심스러운 활동 패턴 감지 (특정 IP에서 비정상적인 시도)
export async function detectSuspiciousActivity(ipAddress: string, threshold: number = 10) {
  try {
    const timeFrame = new Date(Date.now() - 15 * 60 * 1000); // 15분
    const failedCount = await db.loginAttempt.count({
      where: {
        ipAddress,
        success: false,
        createdAt: {
          gte: timeFrame,
        },
      },
    });

    return failedCount >= threshold;
  } catch (error) {
    console.error("의심스러운 활동 감지 실패:", error);
    return false;
  }
}
