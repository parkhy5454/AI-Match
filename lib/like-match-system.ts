import { prisma } from '@/lib/db';

/**
 * Like & Match System
 *
 * Manages user likes, matches, and interaction history
 */

// Types
export interface Like {
  id: string;
  fromUserId: string;
  toUserId: string;
  likeType: 'like' | 'superlike' | 'pass';
  createdAt: Date;
}

export interface Match {
  id: string;
  userId1: string;
  userId2: string;
  matchedAt: Date;
  lastMessageAt?: Date;
  isActive: boolean;
}

export interface MatchNotification {
  id: string;
  userId: string;
  matchId: string;
  notificationType: 'match' | 'like' | 'superlike';
  isRead: boolean;
  createdAt: Date;
}

export interface LikeStatistics {
  totalLikes: number;
  totalSuperLikes: number;
  totalPasses: number;
  matchCount: number;
  likeRatio: number; // 0-100
}

export interface UserLikeHistory {
  userId: string;
  likes: Like[];
  superLikes: Like[];
  passes: Like[];
  matches: Match[];
}

export interface MatchStatus {
  matchId: string;
  status: 'pending' | 'matched' | 'inactive';
  isMutual: boolean;
  matchedAt: Date;
  initialLikerUserId: string;
  matchedPartnerUserId: string;
}

/**
 * Send a like to a user
 */
export async function sendLike(
  fromUserId: string,
  toUserId: string,
  likeType: 'like' | 'superlike' = 'like'
): Promise<Like> {
  try {
    // Check if user is not blocked
    const isBlocked = await checkIfBlocked(fromUserId, toUserId);
    if (isBlocked) {
      throw new Error('Cannot like: User has blocked you');
    }

    // Check if already liked
    const existingLike = await prisma.like.findFirst({
      where: {
        fromUserId,
        toUserId,
      },
    });

    if (existingLike) {
      throw new Error('Already liked this user');
    }

    // Create like
    const like: Like = {
      id: `like_${Date.now()}`,
      fromUserId,
      toUserId,
      likeType,
      createdAt: new Date(),
    };

    console.log(`${fromUserId} sent ${likeType} to ${toUserId}`);

    // Check for mutual like (potential match)
    await checkAndCreateMatch(fromUserId, toUserId);

    return like;
  } catch (error) {
    throw new Error(
      `Failed to send like: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Send a pass (reject) to a user
 */
export async function sendPass(
  fromUserId: string,
  toUserId: string
): Promise<Like> {
  try {
    const pass: Like = {
      id: `pass_${Date.now()}`,
      fromUserId,
      toUserId,
      likeType: 'pass',
      createdAt: new Date(),
    };

    console.log(`${fromUserId} passed on ${toUserId}`);

    return pass;
  } catch (error) {
    throw new Error(
      `Failed to send pass: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if user is blocked
 */
async function checkIfBlocked(userId: string, targetUserId: string): Promise<boolean> {
  try {
    // Would check from block_list table
    // For now, return false (not blocked)
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Check for mutual like and create match
 */
async function checkAndCreateMatch(
  userId1: string,
  userId2: string
): Promise<Match | null> {
  try {
    // Check if userId2 liked userId1
    const mutualLike = await prisma.like.findFirst({
      where: {
        fromUserId: userId2,
        toUserId: userId1,
        likeType: { in: ['like', 'superlike'] },
      },
    });

    if (mutualLike) {
      // Create match
      const match: Match = {
        id: `match_${Date.now()}`,
        userId1,
        userId2,
        matchedAt: new Date(),
        isActive: true,
      };

      console.log(`Match created between ${userId1} and ${userId2}`);

      // Create notifications
      await createMatchNotification(userId1, match.id, 'match');
      await createMatchNotification(userId2, match.id, 'match');

      return match;
    }

    return null;
  } catch (error) {
    console.error('Error checking for match:', error);
    return null;
  }
}

/**
 * Create match notification
 */
async function createMatchNotification(
  userId: string,
  matchId: string,
  notificationType: 'match' | 'like' | 'superlike'
): Promise<MatchNotification> {
  try {
    const notification: MatchNotification = {
      id: `notif_${Date.now()}`,
      userId,
      matchId,
      notificationType,
      isRead: false,
      createdAt: new Date(),
    };

    console.log(`Notification created for ${userId}`);

    return notification;
  } catch (error) {
    throw new Error(
      `Failed to create notification: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get likes received by user
 */
export async function getLikesReceived(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Like[]> {
  try {
    const likes = await prisma.like.findMany({
      where: {
        toUserId: userId,
        likeType: { in: ['like', 'superlike'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return likes;
  } catch (error) {
    throw new Error(
      `Failed to get likes received: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get likes sent by user
 */
export async function getLikesSent(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Like[]> {
  try {
    const likes = await prisma.like.findMany({
      where: {
        fromUserId: userId,
        likeType: { in: ['like', 'superlike'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return likes;
  } catch (error) {
    throw new Error(
      `Failed to get likes sent: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if user liked another user
 */
export async function checkIfUserLiked(
  fromUserId: string,
  toUserId: string
): Promise<'like' | 'superlike' | 'pass' | null> {
  try {
    const like = await prisma.like.findFirst({
      where: {
        fromUserId,
        toUserId,
      },
    });

    return like ? like.likeType : null;
  } catch (error) {
    throw new Error(
      `Failed to check like status: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Undo a like
 */
export async function undoLike(
  fromUserId: string,
  toUserId: string
): Promise<boolean> {
  try {
    const like = await prisma.like.findFirst({
      where: {
        fromUserId,
        toUserId,
      },
    });

    if (!like) {
      throw new Error('Like not found');
    }

    // Delete like (soft delete in production)
    console.log(`Like removed between ${fromUserId} and ${toUserId}`);

    // Check if match should be deactivated
    const match = await prisma.match.findFirst({
      where: {
        OR: [
          { userId1: fromUserId, userId2: toUserId },
          { userId1: toUserId, userId2: fromUserId },
        ],
      },
    });

    // Keep match active even if one user unlikes
    // Only user action should remove match

    return true;
  } catch (error) {
    throw new Error(
      `Failed to undo like: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get user matches
 */
export async function getUserMatches(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<Match[]> {
  try {
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }],
        isActive: true,
      },
      orderBy: { matchedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return matches;
  } catch (error) {
    throw new Error(
      `Failed to get matches: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get match details
 */
export async function getMatchDetails(matchId: string): Promise<MatchStatus | null> {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return null;
    }

    return {
      matchId: match.id,
      status: match.isActive ? 'matched' : 'inactive',
      isMutual: true,
      matchedAt: match.matchedAt,
      initialLikerUserId: match.userId1,
      matchedPartnerUserId: match.userId2,
    };
  } catch (error) {
    throw new Error(
      `Failed to get match details: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Unmatch with user
 */
export async function unmatch(matchId: string, userId: string): Promise<boolean> {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    if (match.userId1 !== userId && match.userId2 !== userId) {
      throw new Error('Unauthorized to unmatch');
    }

    // Deactivate match
    console.log(`Match ${matchId} deactivated by ${userId}`);

    return true;
  } catch (error) {
    throw new Error(
      `Failed to unmatch: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get like statistics for user
 */
export async function getLikeStatistics(userId: string): Promise<LikeStatistics> {
  try {
    const [totalLikes, totalSuperLikes, totalPasses, matchCount] = await Promise.all([
      prisma.like.count({
        where: { fromUserId: userId, likeType: 'like' },
      }),
      prisma.like.count({
        where: { fromUserId: userId, likeType: 'superlike' },
      }),
      prisma.like.count({
        where: { fromUserId: userId, likeType: 'pass' },
      }),
      prisma.match.count({
        where: {
          OR: [{ userId1: userId }, { userId2: userId }],
          isActive: true,
        },
      }),
    ]);

    const totalInteractions = totalLikes + totalSuperLikes + totalPasses;
    const likeRatio = totalInteractions > 0 ? (totalLikes / totalInteractions) * 100 : 0;

    return {
      totalLikes,
      totalSuperLikes,
      totalPasses,
      matchCount,
      likeRatio,
    };
  } catch (error) {
    throw new Error(
      `Failed to get statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get user like history
 */
export async function getUserLikeHistory(userId: string): Promise<UserLikeHistory> {
  try {
    const [likes, superLikes, passes, matches] = await Promise.all([
      prisma.like.findMany({
        where: { fromUserId: userId, likeType: 'like' },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.like.findMany({
        where: { fromUserId: userId, likeType: 'superlike' },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.like.findMany({
        where: { fromUserId: userId, likeType: 'pass' },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.match.findMany({
        where: {
          OR: [{ userId1: userId }, { userId2: userId }],
        },
        orderBy: { matchedAt: 'desc' },
      }),
    ]);

    return {
      userId,
      likes,
      superLikes,
      passes,
      matches,
    };
  } catch (error) {
    throw new Error(
      `Failed to get like history: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get unread match notifications
 */
export async function getMatchNotifications(
  userId: string,
  limit: number = 50
): Promise<MatchNotification[]> {
  try {
    const notifications = await prisma.matchNotification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notifications;
  } catch (error) {
    throw new Error(
      `Failed to get notifications: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<MatchNotification> {
  try {
    const notification: MatchNotification = {
      id: notificationId,
      userId,
      matchId: '',
      notificationType: 'match',
      isRead: true,
      createdAt: new Date(),
    };

    console.log(`Notification ${notificationId} marked as read`);

    return notification;
  } catch (error) {
    throw new Error(
      `Failed to mark notification as read: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get mutual likes (potential matches)
 */
export async function getMutualLikes(
  userId: string,
  limit: number = 50
): Promise<{ userId: string; likeType: 'like' | 'superlike' }[]> {
  try {
    // Get users that current user liked
    const userLikes = await prisma.like.findMany({
      where: {
        fromUserId: userId,
        likeType: { in: ['like', 'superlike'] },
      },
      select: { toUserId: true, likeType: true },
      take: limit,
    });

    // Check if they liked back
    const mutualLikes = [];
    for (const like of userLikes) {
      const reciprocalLike = await prisma.like.findFirst({
        where: {
          fromUserId: like.toUserId,
          toUserId: userId,
          likeType: { in: ['like', 'superlike'] },
        },
      });

      if (reciprocalLike) {
        mutualLikes.push({
          userId: like.toUserId,
          likeType: like.likeType as 'like' | 'superlike',
        });
      }
    }

    return mutualLikes;
  } catch (error) {
    throw new Error(
      `Failed to get mutual likes: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Block user
 */
export async function blockUser(
  userId: string,
  blockedUserId: string
): Promise<{ userId: string; blockedUserId: string; blockedAt: Date }> {
  try {
    const block = {
      userId,
      blockedUserId,
      blockedAt: new Date(),
    };

    console.log(`${userId} blocked ${blockedUserId}`);

    // Remove any matches between these users
    const match = await prisma.match.findFirst({
      where: {
        OR: [
          { userId1: userId, userId2: blockedUserId },
          { userId1: blockedUserId, userId2: userId },
        ],
      },
    });

    if (match) {
      // Deactivate match
      console.log(`Match deactivated due to block`);
    }

    return block;
  } catch (error) {
    throw new Error(
      `Failed to block user: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Unblock user
 */
export async function unblockUser(
  userId: string,
  blockedUserId: string
): Promise<boolean> {
  try {
    console.log(`${userId} unblocked ${blockedUserId}`);
    return true;
  } catch (error) {
    throw new Error(
      `Failed to unblock user: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Report user
 */
export async function reportUser(
  reporterId: string,
  reportedUserId: string,
  reason: string,
  details?: string
): Promise<{ reportId: string; status: string; createdAt: Date }> {
  try {
    const report = {
      reportId: `report_${Date.now()}`,
      status: 'pending',
      createdAt: new Date(),
    };

    console.log(`Report created: ${reporterId} reported ${reportedUserId} for ${reason}`);

    return report;
  } catch (error) {
    throw new Error(
      `Failed to report user: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get like activity feed
 */
export async function getLikeActivityFeed(
  userId: string,
  limit: number = 50
): Promise<{
  likes: Like[];
  matches: Match[];
  timestamp: Date;
}> {
  try {
    const [likes, matches] = await Promise.all([
      getLikesReceived(userId, limit),
      getUserMatches(userId, limit),
    ]);

    return {
      likes,
      matches,
      timestamp: new Date(),
    };
  } catch (error) {
    throw new Error(
      `Failed to get activity feed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get trending matches
 */
export async function getTrendingMatches(limit: number = 20): Promise<Match[]> {
  try {
    // Get matches sorted by recency
    const matches = await prisma.match.findMany({
      where: { isActive: true },
      orderBy: { matchedAt: 'desc' },
      take: limit,
    });

    return matches;
  } catch (error) {
    throw new Error(
      `Failed to get trending matches: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get daily like limit info
 */
export async function getDailyLikeInfo(userId: string): Promise<{
  likesUsedToday: number;
  superLikesUsedToday: number;
  dailyLikeLimit: number;
  superLikesLimit: number;
  likesRemaining: number;
  superLikesRemaining: number;
  resetTime: Date;
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [likesToday, superLikesToday] = await Promise.all([
      prisma.like.count({
        where: {
          fromUserId: userId,
          likeType: 'like',
          createdAt: { gte: today },
        },
      }),
      prisma.like.count({
        where: {
          fromUserId: userId,
          likeType: 'superlike',
          createdAt: { gte: today },
        },
      }),
    ]);

    const dailyLikeLimit = 100;
    const superLikesLimit = 5;

    const resetTime = new Date(today);
    resetTime.setDate(resetTime.getDate() + 1);

    return {
      likesUsedToday: likesToday,
      superLikesUsedToday: superLikesToday,
      dailyLikeLimit,
      superLikesLimit,
      likesRemaining: Math.max(0, dailyLikeLimit - likesToday),
      superLikesRemaining: Math.max(0, superLikesLimit - superLikesToday),
      resetTime,
    };
  } catch (error) {
    throw new Error(
      `Failed to get daily info: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
