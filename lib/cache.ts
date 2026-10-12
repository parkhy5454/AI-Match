/**
 * 간단한 메모리 기반 캐시 (프로덕션에서는 Redis 권장)
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

/**
 * 캐시에서 데이터 조회
 */
export function getCache<T>(key: string): T | null {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  // 만료 확인
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * 캐시에 데이터 저장
 */
export function setCache<T>(
  key: string,
  data: T,
  ttlSeconds: number = 300 // 기본 5분
): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * 캐시 삭제
 */
export function deleteCache(key: string): void {
  cache.delete(key);
}

/**
 * 패턴으로 캐시 삭제 (예: user:* 패턴)
 */
export function deleteCachePattern(pattern: string): void {
  const regex = new RegExp(`^${pattern.replace('*', '.*')}$`);
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

/**
 * 모든 캐시 삭제
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * 캐시 통계
 */
export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

/**
 * 자동 만료 캐시 정리 (정기적으로 호출)
 */
export function cleanupExpiredCache(): number {
  let deletedCount = 0;
  const now = Date.now();

  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
      deletedCount++;
    }
  }

  return deletedCount;
}
