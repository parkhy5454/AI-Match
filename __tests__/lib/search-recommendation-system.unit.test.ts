import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  searchUsers,
  advancedSearch,
  getRecommendations,
  getTrendingProfiles,
  saveSearch,
  getSavedSearches,
  trackSearchActivity,
  getSearchAnalytics,
  type SearchFilter,
} from '@/lib/search-recommendation-system';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    like: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    match: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    blockedUser: {
      findMany: vi.fn(),
    },
    message: {
      count: vi.fn(),
    },
  },
}));

describe('Search & Recommendation System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchUsers', () => {
    it('should search users with filters', async () => {
      const mockUsers = [
        {
          id: 'user-2',
          username: 'alice',
          age: 25,
          gender: 'female',
          region: 'Seoul',
          mbti: 'ENFP',
          profileImage: 'url',
          photoVerified: true,
        },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        username: 'bob',
        age: 26,
        gender: 'male',
        region: 'Seoul',
        mbti: 'INTJ',
        searchPreference: { minAge: 23, maxAge: 30 },
      } as any);
      vi.mocked(prisma.blockedUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.match.findMany).mockResolvedValue([]);
      vi.mocked(prisma.like.findMany).mockResolvedValue([]);

      const filters: SearchFilter = { minAge: 23, maxAge: 30 };
      const result = await searchUsers('user-1', filters, 20, 0);

      expect(result.results).toBeDefined();
      expect(result.total).toBe(1);
      expect(prisma.user.findMany).toHaveBeenCalled();
    });

    it('should exclude blocked users from results', async () => {
      const mockUsers = [
        {
          id: 'user-2',
          username: 'alice',
          age: 25,
          gender: 'female',
          region: 'Seoul',
          mbti: 'ENFP',
          profileImage: 'url',
          photoVerified: true,
        },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);
      vi.mocked(prisma.user.count).mockResolvedValue(2);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        username: 'bob',
        age: 26,
      } as any);
      vi.mocked(prisma.blockedUser.findMany).mockResolvedValue([
        { blockedId: 'user-2' } as any,
      ]);
      vi.mocked(prisma.match.findMany).mockResolvedValue([]);
      vi.mocked(prisma.like.findMany).mockResolvedValue([]);

      const filters: SearchFilter = {};
      const result = await searchUsers('user-1', filters, 20, 0);

      expect(result.results).toBeDefined();
    });

    it('should apply age filter', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({} as any);
      vi.mocked(prisma.blockedUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.match.findMany).mockResolvedValue([]);
      vi.mocked(prisma.like.findMany).mockResolvedValue([]);

      const filters: SearchFilter = { minAge: 25, maxAge: 35 };
      await searchUsers('user-1', filters, 20, 0);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            age: { gte: 25, lte: 35 },
          }),
        })
      );
    });

    it('should apply region filter', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({} as any);
      vi.mocked(prisma.blockedUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.match.findMany).mockResolvedValue([]);
      vi.mocked(prisma.like.findMany).mockResolvedValue([]);

      const filters: SearchFilter = { regions: ['Seoul', 'Busan'] };
      await searchUsers('user-1', filters, 20, 0);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            region: { in: ['Seoul', 'Busan'] },
          }),
        })
      );
    });

    it('should apply MBTI filter', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({} as any);
      vi.mocked(prisma.blockedUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.match.findMany).mockResolvedValue([]);
      vi.mocked(prisma.like.findMany).mockResolvedValue([]);

      const filters: SearchFilter = { mbtiTypes: ['ENFP', 'ESFP'] };
      await searchUsers('user-1', filters, 20, 0);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            mbti: { in: ['ENFP', 'ESFP'] },
          }),
        })
      );
    });

    it('should apply verification filter', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({} as any);
      vi.mocked(prisma.blockedUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.match.findMany).mockResolvedValue([]);
      vi.mocked(prisma.like.findMany).mockResolvedValue([]);

      const filters: SearchFilter = { verified: true };
      await searchUsers('user-1', filters, 20, 0);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            photoVerified: true,
          }),
        })
      );
    });

    it('should handle search errors', async () => {
      vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('Database error'));

      const filters: SearchFilter = {};
      await expect(searchUsers('user-1', filters)).rejects.toThrow('Search failed');
    });

    it('should support pagination', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(100);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({} as any);
      vi.mocked(prisma.blockedUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.match.findMany).mockResolvedValue([]);
      vi.mocked(prisma.like.findMany).mockResolvedValue([]);

      const filters: SearchFilter = {};
      await searchUsers('user-1', filters, 20, 40);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        })
      );
    });
  });

  describe('advancedSearch', () => {
    it('should perform advanced search with relevance sorting', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'user-2',
          username: 'alice',
          age: 25,
          gender: 'female',
          region: 'Seoul',
          mbti: 'ENFP',
          profileImage: 'url',
          photoVerified: true,
        },
      ] as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        username: 'bob',
        age: 26,
      } as any);
      vi.mocked(prisma.blockedUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.match.findMany).mockResolvedValue([]);
      vi.mocked(prisma.like.findMany).mockResolvedValue([]);

      const filters: SearchFilter = {};
      const results = await advancedSearch('user-1', filters, 'relevance', 10, 0);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should apply sorting options', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([] as any);
      vi.mocked(prisma.user.count).mockResolvedValue(0);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({} as any);
      vi.mocked(prisma.blockedUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.match.findMany).mockResolvedValue([]);
      vi.mocked(prisma.like.findMany).mockResolvedValue([]);

      const filters: SearchFilter = {};

      for (const sortBy of ['relevance', 'recent', 'popular'] as const) {
        const results = await advancedSearch('user-1', filters, sortBy, 10, 0);
        expect(Array.isArray(results)).toBe(true);
      }
    });
  });

  describe('getRecommendations', () => {
    it('should get personalized recommendations', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        username: 'bob',
        age: 26,
        gender: 'male',
        region: 'Seoul',
        mbti: 'INTJ',
        photoVerified: true,
        minAge: 23,
        maxAge: 30,
      } as any);
      vi.mocked(prisma.match.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'user-2',
          username: 'alice',
          age: 25,
          gender: 'female',
          region: 'Seoul',
          mbti: 'ENFP',
          photoVerified: true,
        },
      ] as any);
      vi.mocked(prisma.blockedUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.like.findMany).mockResolvedValue([]);

      const recommendations = await getRecommendations('user-1', 10);

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should throw error if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(getRecommendations('invalid-id', 10)).rejects.toThrow(
        'User not found'
      );
    });

    it('should exclude blocked users from recommendations', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        username: 'bob',
        age: 26,
      } as any);
      vi.mocked(prisma.match.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: 'user-2', username: 'alice', age: 25 },
        { id: 'user-3', username: 'charlie', age: 27 },
      ] as any);
      vi.mocked(prisma.blockedUser.findMany).mockResolvedValue([
        { blockedId: 'user-2' } as any,
      ]);
      vi.mocked(prisma.like.findMany).mockResolvedValue([]);

      const recommendations = await getRecommendations('user-1', 10);

      expect(recommendations.every(r => r.userId !== 'user-2')).toBe(true);
    });

    it('should rank by recommendation score', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        username: 'bob',
        age: 26,
        mbti: 'INTJ',
        region: 'Seoul',
      } as any);
      vi.mocked(prisma.match.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: 'user-2', username: 'alice', age: 26, mbti: 'ENFP', region: 'Seoul' },
        { id: 'user-3', username: 'charlie', age: 50, mbti: 'ISTP', region: 'Busan' },
      ] as any);
      vi.mocked(prisma.blockedUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.like.findMany).mockResolvedValue([]);

      const recommendations = await getRecommendations('user-1', 10);

      if (recommendations.length > 1) {
        expect(recommendations[0].recommendationScore).toBeGreaterThanOrEqual(
          recommendations[1].recommendationScore
        );
      }
    });
  });

  describe('getTrendingProfiles', () => {
    it('should return trending profiles', async () => {
      const mockUsers = [
        {
          id: 'user-2',
          username: 'alice',
          age: 25,
          gender: 'female',
          region: 'Seoul',
          mbti: 'ENFP',
          profileImage: 'url',
          photoVerified: true,
        },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);
      vi.mocked(prisma.blockedUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.like.findMany).mockResolvedValue([]);
      vi.mocked(prisma.match.findMany).mockResolvedValue([]);

      const results = await getTrendingProfiles('user-1', 10, 0);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should support pagination', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([] as any);
      vi.mocked(prisma.blockedUser.findMany).mockResolvedValue([]);
      vi.mocked(prisma.like.findMany).mockResolvedValue([]);
      vi.mocked(prisma.match.findMany).mockResolvedValue([]);

      await getTrendingProfiles('user-1', 10, 20);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
    });
  });

  describe('saveSearch', () => {
    it('should save search with filters', async () => {
      const filters: SearchFilter = { minAge: 25, maxAge: 35 };
      const saved = await saveSearch('user-1', 'My Search', filters);

      expect(saved).toBeDefined();
      expect(saved.userId).toBe('user-1');
      expect(saved.name).toBe('My Search');
      expect(saved.filters).toEqual(filters);
    });

    it('should generate unique search id', async () => {
      const search1 = await saveSearch('user-1', 'Search 1', {});
      const search2 = await saveSearch('user-1', 'Search 2', {});

      expect(search1.id).not.toBe(search2.id);
    });
  });

  describe('getSavedSearches', () => {
    it('should return array of saved searches', async () => {
      const searches = await getSavedSearches('user-1');

      expect(Array.isArray(searches)).toBe(true);
    });
  });

  describe('trackSearchActivity', () => {
    it('should track search activity without errors', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await trackSearchActivity('user-1', { minAge: 25, maxAge: 35 });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getSearchAnalytics', () => {
    it('should return search analytics', async () => {
      vi.mocked(prisma.like.findMany).mockResolvedValue([
        { createdAt: new Date() },
        { createdAt: new Date() },
      ] as any);
      vi.mocked(prisma.match.findMany).mockResolvedValue([
        { createdAt: new Date() },
      ] as any);

      const analytics = await getSearchAnalytics('user-1');

      expect(analytics).toBeDefined();
      expect(analytics.userId).toBe('user-1');
      expect(analytics.totalLikes).toBe(2);
      expect(analytics.totalMatches).toBe(1);
      expect(analytics.conversionRate).toBe(0.5);
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.like.findMany).mockRejectedValue(new Error('DB error'));

      await expect(getSearchAnalytics('user-1')).rejects.toThrow(
        'Failed to get search analytics'
      );
    });
  });
});
