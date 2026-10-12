import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cacheSet, cacheGet, cacheDel, cacheDelPattern } from '@/app/lib/redis';

describe('Redis Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set and get cache value', async () => {
    const key = 'test:key';
    const value = { id: '1', name: 'Test' };

    await cacheSet(key, value, 3600);
    const result = await cacheGet(key);

    expect(result).toEqual(value);
  });

  it('should delete cache value', async () => {
    const key = 'test:key';
    await cacheSet(key, { test: true }, 3600);
    const deleted = await cacheDel(key);

    expect(deleted).toBe(true);
  });

  it('should delete keys matching pattern', async () => {
    await cacheSet('user:1', { id: '1' }, 3600);
    await cacheSet('user:2', { id: '2' }, 3600);

    const count = await cacheDelPattern('user:*');
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('should return null for non-existent key', async () => {
    const result = await cacheGet('non:existent');
    expect(result).toBeNull();
  });
});
