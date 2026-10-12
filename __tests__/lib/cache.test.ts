import { describe, it, expect } from 'vitest';
import { CACHE_KEYS, CACHE_TTL, generateCacheKey, invalidateUserCache } from '@/app/lib/cache';

describe('Cache Utilities', () => {
  it('should generate correct user cache key', () => {
    const key = CACHE_KEYS.USER('user-123');
    expect(key).toBe('user:user-123');
  });

  it('should generate correct recommendations cache key', () => {
    const key = CACHE_KEYS.RECOMMENDATIONS('user-123');
    expect(key).toBe('recommendations:user-123');
  });

  it('should have correct TTL values', () => {
    expect(CACHE_TTL.USER).toBe(3600);
    expect(CACHE_TTL.RECOMMENDATIONS).toBe(1800);
    expect(CACHE_TTL.SEARCH_RESULTS).toBe(900);
  });

  it('should generate cache key from prefix and parts', () => {
    const key = generateCacheKey('user', '123', 'profile');
    expect(key).toBe('user:123:profile');
  });

  it('should invalidate user cache keys', () => {
    const keys = invalidateUserCache('user-123');
    expect(keys).toContain('user:user-123');
    expect(keys).toContain('recommendations:user-123');
  });
});
