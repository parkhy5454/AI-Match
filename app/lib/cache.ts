export const CACHE_KEYS = {
  USER: (userId: string) => `user:${userId}`,
  RECOMMENDATIONS: (userId: string) => `recommendations:${userId}`,
  SEARCH_RESULTS: (userId: string, query: string) => `search:${userId}:${Buffer.from(query).toString('base64')}`,
  BADGES: (userId: string) => `badges:${userId}`,
  ACHIEVEMENTS: (userId: string) => `achievements:${userId}`,
  STATS: 'stats:all',
  LEADERBOARD: (type: string) => `leaderboard:${type}`,
} as const;

export const CACHE_TTL = {
  USER: 3600, // 1 hour
  RECOMMENDATIONS: 1800, // 30 minutes
  SEARCH_RESULTS: 900, // 15 minutes
  BADGES: 7200, // 2 hours
  ACHIEVEMENTS: 7200, // 2 hours
  STATS: 3600, // 1 hour
  LEADERBOARD: 3600, // 1 hour
} as const;

export function generateCacheKey(prefix: string, ...parts: string[]): string {
  return [prefix, ...parts].filter(Boolean).join(':');
}

export function invalidateUserCache(userId: string): string[] {
  return [
    `user:${userId}`,
    `recommendations:${userId}`,
    `badges:${userId}`,
    `achievements:${userId}`,
    `search:${userId}:*`,
  ];
}
