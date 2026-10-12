import { LRUCache } from 'lru-cache';

interface RateLimitOptions {
  interval: number; // 밀리초
  maxRequests: number;
}

type RateLimitKey = string;

class RateLimiter {
  private cache: LRUCache<RateLimitKey, number[]>;

  constructor() {
    this.cache = new LRUCache({
      max: 10000,
      maxSize: 50000,
      ttl: 1000 * 60 * 15, // 15분
    });
  }

  isLimited(key: RateLimitKey, options: RateLimitOptions): boolean {
    const now = Date.now();
    const requests = this.cache.get(key) || [];

    // 간격 내의 요청만 유지
    const recentRequests = requests.filter(
      (timestamp) => now - timestamp < options.interval
    );

    if (recentRequests.length >= options.maxRequests) {
      return true;
    }

    recentRequests.push(now);
    this.cache.set(key, recentRequests);
    return false;
  }

  reset(key: RateLimitKey): void {
    this.cache.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

export const RATE_LIMITS = {
  AUTH: { interval: 60000, maxRequests: 5 }, // 5회/분
  MESSAGE: { interval: 60000, maxRequests: 50 }, // 50회/분
  UPLOAD: { interval: 60000, maxRequests: 10 }, // 10회/분
  SEARCH: { interval: 60000, maxRequests: 30 }, // 30회/분
  API: { interval: 60000, maxRequests: 100 }, // 100회/분
} as const;

export function checkRateLimit(
  ip: string,
  endpoint: keyof typeof RATE_LIMITS
): { limited: boolean; remaining: number; resetTime: number } {
  const key = `${ip}:${endpoint}`;
  const config = RATE_LIMITS[endpoint];
  const limited = rateLimiter.isLimited(key, config);

  return {
    limited,
    remaining: limited ? 0 : config.maxRequests,
    resetTime: Date.now() + config.interval,
  };
}
