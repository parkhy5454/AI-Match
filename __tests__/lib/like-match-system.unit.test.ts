import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sendLike,
  sendPass,
  getLikesReceived,
  getLikesSent,
  checkIfUserLiked,
  undoLike,
  getUserMatches,
  getMatchDetails,
  unmatch,
  getLikeStatistics,
  getUserLikeHistory,
  getMatchNotifications,
  markNotificationAsRead,
  getMutualLikes,
  blockUser,
  unblockUser,
  reportUser,
  getLikeActivityFeed,
  getTrendingMatches,
  getDailyLikeInfo,
  type Like,
  type Match,
} from '@/lib/like-match-system';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    like: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    match: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    matchNotification: {
      findMany: vi.fn(),
    },
  },
}));

describe('Like & Match System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendLike', () => {
    it('should send a like to another user', async () => {
      const like = await sendLike('user-1', 'user-2', 'like');

      expect(like).toBeDefined();
      expect(like.fromUserId).toBe('user-1');
      expect(like.toUserId).toBe('user-2');
      expect(like.likeType).toBe('like');
      expect(like.createdAt).toBeDefined();
    });

    it('should send a super like', async () => {
      const superLike = await sendLike('user-1', 'user-2', 'superlike');

      expect(superLike.likeType).toBe('superlike');
    });

    it('should handle duplicate like attempt', async () => {
      vi.mocked(prisma.like.findFirst).mockResolvedValueOnce({
        id: 'like-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        likeType: 'like',
        createdAt: new Date(),
      } as any);

      await expect(sendLike('user-1', 'user-2')).rejects.toThrow(
        'Already liked this user'
      );
    });
  });

  describe('sendPass', () => {
    it('should send a pass (reject)', async () => {
      const pass = await sendPass('user-1', 'user-2');

      expect(pass.likeType).toBe('pass');
      expect(pass.fromUserId).toBe('user-1');
      expect(pass.toUserId).toBe('user-2');
    });
  });

  describe('getLikesReceived', () => {
    it('should return likes received by user', async () => {
      const mockLikes = [
        {
          id: 'like-1',
          fromUserId: 'user-2',
          toUserId: 'user-1',
          likeType: 'like',
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.like.findMany).mockResolvedValueOnce(mockLikes as any);

      const likes = await getLikesReceived('user-1', 50, 0);

      expect(likes).toHaveLength(1);
      expect(likes[0].fromUserId).toBe('user-2');
      expect(prisma.like.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            toUserId: 'user-1',
            likeType: { in: ['like', 'superlike'] },
          },
        })
      );
    });

    it('should support pagination', async () => {
      vi.mocked(prisma.like.findMany).mockResolvedValueOnce([]);

      await getLikesReceived('user-1', 20, 40);

      expect(prisma.like.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 40,
        })
      );
    });
  });

  describe('getLikesSent', () => {
    it('should return likes sent by user', async () => {
      const mockLikes = [
        {
          id: 'like-1',
          fromUserId: 'user-1',
          toUserId: 'user-2',
          likeType: 'like',
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.like.findMany).mockResolvedValueOnce(mockLikes as any);

      const likes = await getLikesSent('user-1');

      expect(likes).toHaveLength(1);
      expect(likes[0].fromUserId).toBe('user-1');
    });
  });

  describe('checkIfUserLiked', () => {
    it('should check if user liked another user', async () => {
      vi.mocked(prisma.like.findFirst).mockResolvedValueOnce({
        id: 'like-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        likeType: 'like',
        createdAt: new Date(),
      } as any);

      const result = await checkIfUserLiked('user-1', 'user-2');

      expect(result).toBe('like');
    });

    it('should return null if no like found', async () => {
      vi.mocked(prisma.like.findFirst).mockResolvedValueOnce(null);

      const result = await checkIfUserLiked('user-1', 'user-2');

      expect(result).toBeNull();
    });

    it('should return superlike if super like exists', async () => {
      vi.mocked(prisma.like.findFirst).mockResolvedValueOnce({
        likeType: 'superlike',
      } as any);

      const result = await checkIfUserLiked('user-1', 'user-2');

      expect(result).toBe('superlike');
    });
  });

  describe('undoLike', () => {
    it('should undo a like', async () => {
      vi.mocked(prisma.like.findFirst).mockResolvedValueOnce({
        id: 'like-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        likeType: 'like',
        createdAt: new Date(),
      } as any);

      const result = await undoLike('user-1', 'user-2');

      expect(result).toBe(true);
    });

    it('should handle non-existent like', async () => {
      vi.mocked(prisma.like.findFirst).mockResolvedValueOnce(null);

      await expect(undoLike('user-1', 'user-2')).rejects.toThrow(
        'Like not found'
      );
    });
  });

  describe('getUserMatches', () => {
    it('should return user matches', async () => {
      const mockMatches = [
        {
          id: 'match-1',
          userId1: 'user-1',
          userId2: 'user-2',
          matchedAt: new Date(),
          isActive: true,
        },
      ];

      vi.mocked(prisma.match.findMany).mockResolvedValueOnce(mockMatches as any);

      const matches = await getUserMatches('user-1', 20, 0);

      expect(matches).toHaveLength(1);
      expect(matches[0].isActive).toBe(true);
    });

    it('should only return active matches', async () => {
      vi.mocked(prisma.match.findMany).mockResolvedValueOnce([]);

      await getUserMatches('user-1');

      expect(prisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });
  });

  describe('getMatchDetails', () => {
    it('should return match details', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce({
        id: 'match-1',
        userId1: 'user-1',
        userId2: 'user-2',
        matchedAt: new Date(),
        isActive: true,
      } as any);

      const details = await getMatchDetails('match-1');

      expect(details).toBeDefined();
      expect(details?.status).toBe('matched');
      expect(details?.isMutual).toBe(true);
    });

    it('should return null if match not found', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce(null);

      const details = await getMatchDetails('invalid-id');

      expect(details).toBeNull();
    });
  });

  describe('unmatch', () => {
    it('should unmatch users', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce({
        id: 'match-1',
        userId1: 'user-1',
        userId2: 'user-2',
        matchedAt: new Date(),
        isActive: true,
      } as any);

      const result = await unmatch('match-1', 'user-1');

      expect(result).toBe(true);
    });

    it('should prevent unauthorized unmatch', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce({
        id: 'match-1',
        userId1: 'user-1',
        userId2: 'user-2',
        matchedAt: new Date(),
        isActive: true,
      } as any);

      await expect(unmatch('match-1', 'user-3')).rejects.toThrow(
        'Unauthorized to unmatch'
      );
    });

    it('should handle non-existent match', async () => {
      vi.mocked(prisma.match.findUnique).mockResolvedValueOnce(null);

      await expect(unmatch('invalid-id', 'user-1')).rejects.toThrow(
        'Match not found'
      );
    });
  });

  describe('getLikeStatistics', () => {
    it('should return like statistics', async () => {
      vi.mocked(prisma.like.count)
        .mockResolvedValueOnce(50) // likes
        .mockResolvedValueOnce(5)  // super likes
        .mockResolvedValueOnce(20) // passes
        .mockResolvedValueOnce(15); // matches

      const stats = await getLikeStatistics('user-1');

      expect(stats.totalLikes).toBe(50);
      expect(stats.totalSuperLikes).toBe(5);
      expect(stats.totalPasses).toBe(20);
      expect(stats.matchCount).toBe(15);
      expect(stats.likeRatio).toBeGreaterThan(0);
    });

    it('should calculate like ratio correctly', async () => {
      vi.mocked(prisma.like.count)
        .mockResolvedValueOnce(60) // likes
        .mockResolvedValueOnce(10) // super likes
        .mockResolvedValueOnce(30) // passes
        .mockResolvedValueOnce(20); // matches

      const stats = await getLikeStatistics('user-1');

      // 60 / (60 + 10 + 30) * 100 = 60%
      expect(stats.likeRatio).toBe(60);
    });
  });

  describe('getUserLikeHistory', () => {
    it('should return user like history', async () => {
      const mockLikes = [
        {
          id: 'like-1',
          fromUserId: 'user-1',
          toUserId: 'user-2',
          likeType: 'like',
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.like.findMany)
        .mockResolvedValueOnce(mockLikes as any)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      vi.mocked(prisma.match.findMany).mockResolvedValueOnce([]);

      const history = await getUserLikeHistory('user-1');

      expect(history.userId).toBe('user-1');
      expect(history.likes).toHaveLength(1);
      expect(history.superLikes).toHaveLength(0);
    });
  });

  describe('getMatchNotifications', () => {
    it('should return unread notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-1',
          matchId: 'match-1',
          notificationType: 'match',
          isRead: false,
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.matchNotification.findMany).mockResolvedValueOnce(
        mockNotifications as any
      );

      const notifications = await getMatchNotifications('user-1');

      expect(notifications).toHaveLength(1);
      expect(notifications[0].isRead).toBe(false);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = await markNotificationAsRead('notif-1', 'user-1');

      expect(notification.isRead).toBe(true);
    });
  });

  describe('getMutualLikes', () => {
    it('should return mutual likes', async () => {
      const userLikes = [
        {
          toUserId: 'user-2',
          likeType: 'like',
        },
      ];

      vi.mocked(prisma.like.findMany).mockResolvedValueOnce(userLikes as any);
      vi.mocked(prisma.like.findFirst).mockResolvedValueOnce({
        fromUserId: 'user-2',
        toUserId: 'user-1',
        likeType: 'like',
      } as any);

      const mutuals = await getMutualLikes('user-1');

      expect(mutuals).toHaveLength(1);
      expect(mutuals[0].userId).toBe('user-2');
    });
  });

  describe('blockUser', () => {
    it('should block a user', async () => {
      const block = await blockUser('user-1', 'user-2');

      expect(block.userId).toBe('user-1');
      expect(block.blockedUserId).toBe('user-2');
      expect(block.blockedAt).toBeDefined();
    });

    it('should deactivate match when blocking', async () => {
      vi.mocked(prisma.match.findFirst).mockResolvedValueOnce({
        id: 'match-1',
        userId1: 'user-1',
        userId2: 'user-2',
        matchedAt: new Date(),
        isActive: true,
      } as any);

      const result = await blockUser('user-1', 'user-2');

      expect(result).toBeDefined();
    });
  });

  describe('unblockUser', () => {
    it('should unblock a user', async () => {
      const result = await unblockUser('user-1', 'user-2');

      expect(result).toBe(true);
    });
  });

  describe('reportUser', () => {
    it('should report a user', async () => {
      const report = await reportUser('user-1', 'user-2', 'inappropriate_behavior');

      expect(report.reportId).toBeDefined();
      expect(report.status).toBe('pending');
      expect(report.createdAt).toBeDefined();
    });

    it('should include report details', async () => {
      const report = await reportUser(
        'user-1',
        'user-2',
        'inappropriate_behavior',
        'User sent inappropriate messages'
      );

      expect(report.status).toBe('pending');
    });
  });

  describe('getLikeActivityFeed', () => {
    it('should return activity feed', async () => {
      vi.mocked(prisma.like.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.match.findMany).mockResolvedValueOnce([]);

      const feed = await getLikeActivityFeed('user-1');

      expect(feed.likes).toBeDefined();
      expect(feed.matches).toBeDefined();
      expect(feed.timestamp).toBeDefined();
    });
  });

  describe('getTrendingMatches', () => {
    it('should return trending matches', async () => {
      const mockMatches = [
        {
          id: 'match-1',
          userId1: 'user-1',
          userId2: 'user-2',
          matchedAt: new Date(),
          isActive: true,
        },
      ];

      vi.mocked(prisma.match.findMany).mockResolvedValueOnce(mockMatches as any);

      const matches = await getTrendingMatches(20);

      expect(matches).toHaveLength(1);
      expect(matches[0].isActive).toBe(true);
    });

    it('should only return active matches sorted by recency', async () => {
      vi.mocked(prisma.match.findMany).mockResolvedValueOnce([]);

      await getTrendingMatches();

      expect(prisma.match.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          orderBy: { matchedAt: 'desc' },
        })
      );
    });
  });

  describe('getDailyLikeInfo', () => {
    it('should return daily like information', async () => {
      vi.mocked(prisma.like.count)
        .mockResolvedValueOnce(50)  // likes today
        .mockResolvedValueOnce(3);  // super likes today

      const info = await getDailyLikeInfo('user-1');

      expect(info.likesUsedToday).toBe(50);
      expect(info.superLikesUsedToday).toBe(3);
      expect(info.dailyLikeLimit).toBe(100);
      expect(info.superLikesLimit).toBe(5);
    });

    it('should calculate remaining likes', async () => {
      vi.mocked(prisma.like.count)
        .mockResolvedValueOnce(70)  // likes today
        .mockResolvedValueOnce(2);  // super likes today

      const info = await getDailyLikeInfo('user-1');

      expect(info.likesRemaining).toBe(30); // 100 - 70
      expect(info.superLikesRemaining).toBe(3); // 5 - 2
    });

    it('should never return negative remaining likes', async () => {
      vi.mocked(prisma.like.count)
        .mockResolvedValueOnce(150) // likes today (over limit)
        .mockResolvedValueOnce(10); // super likes today (over limit)

      const info = await getDailyLikeInfo('user-1');

      expect(info.likesRemaining).toBe(0);
      expect(info.superLikesRemaining).toBe(0);
    });

    it('should have reset time for next day', async () => {
      vi.mocked(prisma.like.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const info = await getDailyLikeInfo('user-1');

      expect(info.resetTime).toBeInstanceOf(Date);
      expect(info.resetTime.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete like flow: like -> mutual like -> match', async () => {
      // User A sends like to User B
      const like1 = await sendLike('user-a', 'user-b', 'like');
      expect(like1.fromUserId).toBe('user-a');

      // User B sends like back to User A
      vi.mocked(prisma.like.findFirst).mockResolvedValueOnce(like1 as any);
      const like2 = await sendLike('user-b', 'user-a', 'like');
      expect(like2.fromUserId).toBe('user-b');

      // Check match was created
      vi.mocked(prisma.match.findMany).mockResolvedValueOnce([
        {
          id: 'match-1',
          userId1: 'user-a',
          userId2: 'user-b',
          matchedAt: new Date(),
          isActive: true,
        } as any,
      ]);

      const matches = await getUserMatches('user-a');
      expect(matches).toHaveLength(1);
    });

    it('should handle like -> unlike flow', async () => {
      // Send like
      const like = await sendLike('user-1', 'user-2', 'like');
      expect(like.likeType).toBe('like');

      // Undo like
      vi.mocked(prisma.like.findFirst).mockResolvedValueOnce(like as any);
      const undone = await undoLike('user-1', 'user-2');
      expect(undone).toBe(true);
    });

    it('should handle block flow', async () => {
      // Block user
      const block = await blockUser('user-1', 'user-2');
      expect(block.userId).toBe('user-1');

      // Verify likes are prevented
      // This would be checked in sendLike function
    });
  });
});
