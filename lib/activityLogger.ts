/**
 * 사용자 활동 로깅 유틸리티
 * 감사(audit) 및 보안 목적
 */

export type ActivityType =
  | "LOGIN"
  | "LOGOUT"
  | "SIGNUP"
  | "PASSWORD_CHANGE"
  | "EMAIL_VERIFIED"
  | "PROFILE_UPDATE"
  | "PHOTO_UPLOAD"
  | "LIKE_SENT"
  | "LIKE_RECEIVED"
  | "MATCH_CREATED"
  | "MESSAGE_SENT"
  | "USER_BLOCKED"
  | "ACCOUNT_DELETED"
  | "REPORT_FILED"
  | "REPORT_RECEIVED";

export interface ActivityLog {
  userId: string;
  activityType: ActivityType;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * 활동 로그 저장소 (메모리 기반, 프로덕션에서는 DB 사용 권장)
 */
const activityLogs: ActivityLog[] = [];

/**
 * 활동 로깅
 */
export function logActivity(
  userId: string,
  activityType: ActivityType,
  description: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }
) {
  const log: ActivityLog = {
    userId,
    activityType,
    description,
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
    metadata: options?.metadata,
    timestamp: new Date(),
  };

  // 메모리 저장 (최근 1000개만 유지)
  activityLogs.push(log);
  if (activityLogs.length > 1000) {
    activityLogs.shift();
  }

  console.log(`[Activity] ${userId} - ${activityType}: ${description}`);

  return log;
}

/**
 * 특정 사용자의 활동 이력 조회
 */
export function getUserActivityLogs(
  userId: string,
  limit: number = 100
): ActivityLog[] {
  return activityLogs
    .filter((log) => log.userId === userId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * 특정 활동 타입의 로그 조회
 */
export function getActivityLogsByType(
  activityType: ActivityType,
  limit: number = 100
): ActivityLog[] {
  return activityLogs
    .filter((log) => log.activityType === activityType)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * 시간 범위 내 활동 조회
 */
export function getActivityLogsByTimeRange(
  startDate: Date,
  endDate: Date,
  userId?: string
): ActivityLog[] {
  return activityLogs.filter((log) => {
    const isInRange =
      log.timestamp >= startDate && log.timestamp <= endDate;
    const userMatch = !userId || log.userId === userId;
    return isInRange && userMatch;
  });
}

/**
 * 의심 활동 감지
 */
export function detectSuspiciousActivity(
  userId: string,
  timeWindowMinutes: number = 60
): ActivityLog[] {
  const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
  const userLogs = activityLogs.filter(
    (log) => log.userId === userId && log.timestamp >= cutoffTime
  );

  // 로그인 시도 실패가 많은 경우 (추후 구현)
  // 비정상적인 활동 패턴 감지 (추후 구현)

  return userLogs;
}

/**
 * 활동 통계
 */
export function getActivityStatistics(userId?: string) {
  const logs = userId ? activityLogs.filter((log) => log.userId === userId) : activityLogs;

  const stats: Record<ActivityType, number> = {
    LOGIN: 0,
    LOGOUT: 0,
    SIGNUP: 0,
    PASSWORD_CHANGE: 0,
    EMAIL_VERIFIED: 0,
    PROFILE_UPDATE: 0,
    PHOTO_UPLOAD: 0,
    LIKE_SENT: 0,
    LIKE_RECEIVED: 0,
    MATCH_CREATED: 0,
    MESSAGE_SENT: 0,
    USER_BLOCKED: 0,
    ACCOUNT_DELETED: 0,
    REPORT_FILED: 0,
    REPORT_RECEIVED: 0,
  };

  logs.forEach((log) => {
    stats[log.activityType]++;
  });

  return stats;
}

/**
 * 로그인 시도 감시
 */
export function getLoginAttempts(
  userId: string,
  timeWindowMinutes: number = 30
): number {
  const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
  return activityLogs.filter(
    (log) =>
      log.userId === userId &&
      log.activityType === "LOGIN" &&
      log.timestamp >= cutoffTime
  ).length;
}

/**
 * 활동 로그 내보내기 (CSV)
 */
export function exportActivityLogsAsCSV(userId?: string): string {
  const logs = userId ? activityLogs.filter((log) => log.userId === userId) : activityLogs;

  const headers = [
    "사용자ID",
    "활동타입",
    "설명",
    "IP주소",
    "사용자에이전트",
    "메타데이터",
    "시간",
  ];

  const rows = logs.map((log) => [
    log.userId,
    log.activityType,
    log.description,
    log.ipAddress || "-",
    log.userAgent || "-",
    JSON.stringify(log.metadata || {}),
    log.timestamp.toISOString(),
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csv;
}

/**
 * 활동 로그 삭제
 */
export function clearActivityLogs(userId?: string) {
  if (userId) {
    const index = activityLogs.findIndex((log) => log.userId === userId);
    if (index !== -1) {
      activityLogs.splice(index, 1);
    }
  } else {
    activityLogs.length = 0;
  }
}
