/**
 * 메모리 기반 Rate Limiter
 * 프로덕션 환경에서는 Redis 사용 권장
 */

interface RateLimitEntry {
  attempts: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Rate limit 체크
 * @param key - 식별자 (IP, 사용자 ID 등)
 * @param maxAttempts - 최대 시도 횟수
 * @param windowMs - 시간 윈도우 (밀리초)
 * @returns { allowed: boolean, remaining: number, retryAfter?: number }
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15분
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    // 새로운 윈도우 시작
    rateLimitMap.set(key, {
      attempts: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  entry.attempts++;
  const remaining = Math.max(0, maxAttempts - entry.attempts);
  const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

  if (entry.attempts > maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    };
  }

  return { allowed: true, remaining };
}

/**
 * Rate limit 리셋
 */
export function resetRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

/**
 * 모든 rate limit 초기화 (테스트용)
 */
export function clearAllRateLimits(): void {
  rateLimitMap.clear();
}
