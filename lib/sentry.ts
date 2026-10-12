/**
 * Sentry 에러 추적 통합
 * 프로덕션 환경에서 에러 모니터링 및 추적
 */

interface SentryConfig {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  debug: boolean;
}

/**
 * Sentry 설정 (환경 변수에서 읽음)
 */
export const sentryConfig: SentryConfig = {
  dsn: process.env.SENTRY_DSN || "",
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: process.env.NODE_ENV !== "production",
};

/**
 * 에러를 Sentry에 전송
 * 실제 구현에서는 Sentry SDK 사용
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (!sentryConfig.dsn) {
    console.warn("[Sentry] DSN이 설정되지 않았습니다");
    return;
  }

  // 실제 환경에서는 Sentry SDK 사용
  // Sentry.captureException(error, { extra: context });

  console.error("[Sentry] 에러 전송:", {
    message: error.message,
    stack: error.stack,
    context,
  });
}

/**
 * 메시지를 Sentry에 전송
 */
export function captureMessage(
  message: string,
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
  context?: Record<string, any>
) {
  if (!sentryConfig.dsn) {
    console.warn("[Sentry] DSN이 설정되지 않았습니다");
    return;
  }

  // 실제 환경에서는 Sentry SDK 사용
  // Sentry.captureMessage(message, level);

  console.log(`[Sentry] ${level.toUpperCase()}: ${message}`, context || "");
}

/**
 * 성능 메트릭 추적
 */
export function trackPerformance(
  operation: string,
  duration: number,
  metadata?: Record<string, any>
) {
  if (duration > 1000) {
    // 1초 이상이면 warning으로 기록
    captureMessage(
      `Slow operation detected: ${operation} took ${duration}ms`,
      "warning",
      { operation, duration, ...metadata }
    );
  }
}

/**
 * 사용자 컨텍스트 설정
 */
export function setUserContext(userId: string, userInfo?: Record<string, any>) {
  // 실제 환경에서는 Sentry SDK 사용
  // Sentry.setUser({ id: userId, ...userInfo });

  console.log("[Sentry] 사용자 컨텍스트 설정:", { userId, ...userInfo });
}

/**
 * 에러 레벨별 로깅
 */
export const Sentry = {
  captureException,
  captureMessage,
  trackPerformance,
  setUserContext,
  
  // 편의 메서드
  error: (message: string, context?: Record<string, any>) =>
    captureMessage(message, "error", context),
  warning: (message: string, context?: Record<string, any>) =>
    captureMessage(message, "warning", context),
  info: (message: string, context?: Record<string, any>) =>
    captureMessage(message, "info", context),
  debug: (message: string, context?: Record<string, any>) =>
    captureMessage(message, "debug", context),
};

export default Sentry;
