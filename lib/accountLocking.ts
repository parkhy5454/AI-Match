import { db } from "@/lib/db";

/**
 * 계정이 일시 정지되었는지 확인
 * @param userId 사용자 ID
 * @returns { locked: boolean, remainingMinutes: number }
 */
export async function checkAccountLock(userId: string): Promise<{ locked: boolean; remainingMinutes: number }> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { suspendedUntil: true, accountStatus: true },
    });

    if (!user) {
      return { locked: false, remainingMinutes: 0 };
    }

    // accountStatus가 suspended인 경우
    if (user.accountStatus === "suspended" && user.suspendedUntil) {
      const now = new Date();
      if (user.suspendedUntil > now) {
        const remainingMs = user.suspendedUntil.getTime() - now.getTime();
        const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
        return { locked: true, remainingMinutes };
      }
    }

    return { locked: false, remainingMinutes: 0 };
  } catch (error) {
    console.error("[Account Locking] 계정 잠금 확인 실패:", error);
    return { locked: false, remainingMinutes: 0 };
  }
}

/**
 * 계정을 일시 정지 (로그인 실패 3회 후)
 * @param userId 사용자 ID
 * @param minutes 정지 시간 (분)
 */
export async function lockAccount(userId: string, minutes: number = 30): Promise<boolean> {
  try {
    const suspendedUntil = new Date(Date.now() + minutes * 60 * 1000);

    await db.user.update({
      where: { id: userId },
      data: {
        accountStatus: "suspended",
        suspendedUntil,
      },
    });

    console.log(
      `[Account Locking] 계정 잠금 (${minutes}분):`,
      userId
    );
    return true;
  } catch (error) {
    console.error("[Account Locking] 계정 잠금 실패:", error);
    return false;
  }
}

/**
 * 계정 잠금 해제
 * @param userId 사용자 ID
 */
export async function unlockAccount(userId: string): Promise<boolean> {
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        accountStatus: "active",
        suspendedUntil: null,
      },
    });

    console.log("[Account Locking] 계정 잠금 해제:", userId);
    return true;
  } catch (error) {
    console.error("[Account Locking] 계정 잠금 해제 실패:", error);
    return false;
  }
}

/**
 * 로그인 실패 후 계정 잠금 처리
 * 실패 횟수가 3회를 넘으면 30분 잠금
 * @param email 이메일
 * @param userId 사용자 ID
 */
export async function handleLoginFailure(email: string, userId: string): Promise<boolean> {
  try {
    // 최근 15분 내 실패 횟수
    const timeFrame = new Date(Date.now() - 15 * 60 * 1000);
    const failedCount = await db.loginAttempt.count({
      where: {
        email,
        success: false,
        createdAt: {
          gte: timeFrame,
        },
      },
    });

    console.log(
      `[Account Locking] 로그인 실패 기록: ${email} (${failedCount}회)`
    );

    // 3회 실패 시 계정 잠금
    if (failedCount >= 3) {
      await lockAccount(userId, 30); // 30분 잠금
      return true;
    }

    return false;
  } catch (error) {
    console.error("[Account Locking] 로그인 실패 처리 에러:", error);
    return false;
  }
}

/**
 * 로그인 성공 후 계정 잠금 자동 해제 (이전에 잠겨있었다면)
 * @param userId 사용자 ID
 */
export async function resetLockOnSuccessfulLogin(userId: string): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { accountStatus: true },
    });

    if (user?.accountStatus === "suspended") {
      await unlockAccount(userId);
    }
  } catch (error) {
    console.error("[Account Locking] 자동 해제 실패:", error);
  }
}
