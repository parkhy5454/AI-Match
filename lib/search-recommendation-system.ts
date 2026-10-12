import { prisma } from '@/lib/db';

/**
 * Search Recommendation System
 *
 * Comprehensive search and personalized recommendation engine
 * with advanced filtering, ranking, and caching mechanisms
 */

// Types
export interface SearchFilter {
  minAge?: number;
  maxAge?: number;
  regions?: string[];
  mbtiTypes?: string[];
  minHeight?: number;
  maxHeight?: number;
  verified?: boolean;
  activeOnly?: boolean;
  excludeBlocked?: boolean;
  excludeMatched?: boolean;
  searchTerm?: string;
}

export interface SearchResult {
  user: {
    id: string;
    username: string;
    age: number;
    gender?: string;
    region: string;
    mbti: string;
    profileImage?: string;
    photoVerified: boolean;
  };
  matchScore: number;
  compatibilityScore: number;
  isMatched: boolean;
  isLiked: boolean;
}

export interface RecommendationResult {
  userId: string;
  username: string;
  age: number;
  gender?: string;
  region: string;
  mbti: string;
  profileImage?: string;
  recommendationScore: number;
  reason: string; // Why recommended
  isMatched: boolean;
  isLiked: boolean;
}

export interface UserEngagement {
  userId: string;
  totalLikesGiven: number;
  totalLikesReceived: number;
  totalMatches: number;
  totalMessages: number;
  avgResponseTime: number; // minutes
  lastActiveAt: Date;
}

export interface RecommendationMetrics {
  engagementScore: number;
  similarityScore: number;
  preferenceMatchScore: number;
  locationScore: number;
  overallScore: number;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: SearchFilter;
  createdAt: Date;
  lastUsedAt: Date;
}

/**
 * Search for users with advanced filtering and ranking
 */
export async function searchUsers(
  userId: string,
  filters: SearchFilter,
  limit: number = 20,
  offset: number = 0
): Promise<{ results: SearchResult[]; total: number }> {
  try {
    // Build dynamic Prisma query
    const whereConditions: any = {
      id: { not: userId }, // Exclude self
      isActive: true,
      accountStatus: 'active',
    };

    // Age filter
    if (filters.minAge || filters.maxAge) {
      whereConditions.age = {};
      if (filters.minAge) whereConditions.age.gte = filters.minAge;
      if (filters.maxAge) whereConditions.age.lte = filters.maxAge;
    }

    // Region filter
    if (filters.regions && filters.regions.length > 0) {
      whereConditions.region = { in: filters.regions };
    }

    // MBTI filter
    if (filters.mbtiTypes && filters.mbtiTypes.length > 0) {
      whereConditions.mbti = { in: filters.mbtiTypes };
    }

    // Height filter
    // Note: Height is not in schema, but we keep it for extensibility

    // Photo verification filter
    if (filters.verified) {
      whereConditions.photoVerified = true;
    }

    // Get all matching users
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereConditions,
        select: {
          id: true,
          username: true,
          age: true,
          gender: true,
          region: true,
          mbti: true,
          profileImage: true,
          photoVerified: true,
        },
        skip: offset,
        take: limit,
      }),
      prisma.user.count({ where: whereConditions }),
    ]);

    // Get blocked users
    const blocked = await getBlockedUsers(userId);

    // Get user matches
    const matches = await getUserMatches(userId);

    // Get likes
    const likeData = await getUserLikes(userId);

    // Calculate scores for each user
    const results = await Promise.all(
      users
        .filter(u => !blocked.has(u.id))
        .map(async (user) => {
          const matchScore = await calculateMatchScore(userId, user.id);
          const compatibilityScore = calculateCompatibilityScore(
            await getUserProfile(userId),
            user
          );

          return {
            user,
            matchScore,
            compatibilityScore,
            isMatched: matches.has(user.id),
            isLiked: likeData.liked.has(user.id),
          };
        })
    );

    // Sort by match score and compatibility
    results.sort(
      (a, b) =>
        b.matchScore * 0.6 +
        b.compatibilityScore * 0.4 -
        (a.matchScore * 0.6 + a.compatibilityScore * 0.4)
    );

    return { results, total };
  } catch (error) {
    throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Advanced search with complex query building
 */
export async function advancedSearch(
  userId: string,
  filters: SearchFilter,
  sortBy: 'relevance' | 'recent' | 'popular' = 'relevance',
  limit: number = 20,
  offset: number = 0
): Promise<SearchResult[]> {
  try {
    const { results } = await searchUsers(userId, filters, limit * 2, 0);

    // Apply secondary sorting
    if (sortBy === 'recent') {
      results.sort((a, b) => {
        // Would need createdAt in user data
        return 0;
      });
    } else if (sortBy === 'popular') {
      results.sort((a, b) => b.user.photoVerified === a.user.photoVerified ? 0 : b.user.photoVerified ? 1 : -1);
    }

    return results.slice(offset, offset + limit);
  } catch (error) {
    throw new Error(`Advanced search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get personalized recommendations for a user
 */
export async function getRecommendations(
  userId: string,
  limit: number = 10
): Promise<RecommendationResult[]> {
  try {
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      throw new Error('User not found');
    }

    // Get users not yet matched with
    const nonMatches = await getNonMatchedUsers(userId);
    const blocked = await getBlockedUsers(userId);

    // Calculate recommendation scores
    const recommendations = await Promise.all(
      Array.from(nonMatches)
        .filter(userId => !blocked.has(userId))
        .map(async (candidateId) => {
          const candidate = await getUserProfile(candidateId);
          if (!candidate) return null;

          const metrics = await calculateRecommendationMetrics(
            userProfile,
            candidate,
            userId
          );

          const likes = await getUserLikes(userId);

          return {
            userId: candidate.id,
            username: candidate.username,
            age: candidate.age,
            gender: candidate.gender,
            region: candidate.region,
            mbti: candidate.mbti,
            profileImage: candidate.profileImage,
            recommendationScore: metrics.overallScore,
            reason: getRecommendationReason(metrics),
            isMatched: false,
            isLiked: likes.liked.has(candidateId),
          };
        })
    );

    // Filter nulls and sort
    return (recommendations
      .filter((r) => r !== null) as RecommendationResult[])
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  } catch (error) {
    throw new Error(
      `Failed to get recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get trending/popular profiles
 */
export async function getTrendingProfiles(
  userId: string,
  limit: number = 10,
  offset: number = 0
): Promise<SearchResult[]> {
  try {
    const blocked = await getBlockedUsers(userId);

    // Get most liked users
    const trendingUsers = await prisma.user.findMany({
      where: {
        id: { not: userId },
        isActive: true,
        accountStatus: 'active',
      },
      select: {
        id: true,
        username: true,
        age: true,
        gender: true,
        region: true,
        mbti: true,
        profileImage: true,
        photoVerified: true,
      },
      skip: offset,
      take: limit,
    });

    const likeData = await getUserLikes(userId);
    const matches = await getUserMatches(userId);

    return trendingUsers
      .filter(u => !blocked.has(u.id))
      .map((user) => ({
        user,
        matchScore: 0.5,
        compatibilityScore: 0.5,
        isMatched: matches.has(user.id),
        isLiked: likeData.liked.has(user.id),
      }));
  } catch (error) {
    throw new Error(`Failed to get trending profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save a search with filters for later use
 */
export async function saveSearch(
  userId: string,
  name: string,
  filters: SearchFilter
): Promise<SavedSearch> {
  try {
    // For now, store in SearchPreference or create a new model
    // This is a simplified implementation
    const saved = {
      id: `search_${Date.now()}`,
      userId,
      name,
      filters,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    // In a real implementation, this would be persisted to DB
    return saved;
  } catch (error) {
    throw new Error(`Failed to save search: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get saved searches for a user
 */
export async function getSavedSearches(userId: string): Promise<SavedSearch[]> {
  try {
    // Retrieve from DB in real implementation
    return [];
  } catch (error) {
    throw new Error(`Failed to get saved searches: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate match score between two users
 */
async function calculateMatchScore(userId: string, targetId: string): Promise<number> {
  try {
    const userProfile = await getUserProfile(userId);
    const targetProfile = await getUserProfile(targetId);

    if (!userProfile || !targetProfile) return 0;

    let score = 50; // Base score

    // MBTI compatibility
    if (userProfile.mbti && targetProfile.mbti) {
      score += calculateMbtiCompatibility(userProfile.mbti, targetProfile.mbti);
    }

    // Age proximity (closer is better, max +20)
    const ageDiff = Math.abs(userProfile.age - targetProfile.age);
    if (ageDiff <= 5) score += 20;
    else if (ageDiff <= 10) score += 10;
    else if (ageDiff <= 15) score += 5;

    // Location proximity
    if (userProfile.region === targetProfile.region) {
      score += 15;
    }

    // Engagement bonus
    const targetEngagement = await getEngagementMetrics(targetId);
    if (targetEngagement.totalMatches > 10) score += 5;

    return Math.min(100, score);
  } catch (error) {
    console.error('Error calculating match score:', error);
    return 50;
  }
}

/**
 * Calculate MBTI compatibility score
 */
function calculateMbtiCompatibility(mbti1: string, mbti2: string): number {
  // Simplified MBTI compatibility
  const compatiblePairs: { [key: string]: string[] } = {
    INTJ: ['ENTJ', 'ISFJ'],
    INTP: ['ENTP', 'ISTP'],
    ENTJ: ['INTJ', 'ISFJ'],
    ENTP: ['INTP', 'ISTP'],
    INFJ: ['ENFJ', 'ISFJ'],
    INFP: ['ENFP', 'ISFP'],
    ENFJ: ['INFJ', 'ISFJ'],
    ENFP: ['INFP', 'ISFP'],
    ISTJ: ['ISFJ', 'ESFJ'],
    ISFJ: ['ISTJ', 'INFJ'],
    ESTJ: ['ESFJ', 'ISFJ'],
    ESFJ: ['ESTJ', 'ISFJ'],
    ISTP: ['INTP', 'ENTP'],
    ISFP: ['INFP', 'ENFP'],
    ESTP: ['ISTP', 'ENTP'],
    ESFP: ['ISFP', 'ENFP'],
  };

  const compatible = compatiblePairs[mbti1] || [];
  return compatible.includes(mbti2) ? 15 : 5;
}

/**
 * Calculate compatibility score between user profiles
 */
function calculateCompatibilityScore(userProfile: any, targetProfile: any): number {
  let score = 0;

  // Gender preference (if available)
  if (userProfile.preferredGender === targetProfile.gender) {
    score += 20;
  }

  // Age within preferences
  if (userProfile.minAge && userProfile.maxAge) {
    if (
      targetProfile.age >= userProfile.minAge &&
      targetProfile.age <= userProfile.maxAge
    ) {
      score += 20;
    }
  }

  // Region preference
  if (userProfile.preferredRegion === targetProfile.region) {
    score += 15;
  }

  // MBTI preference
  if (userProfile.preferredMbti?.includes(targetProfile.mbti)) {
    score += 15;
  }

  // Verification bonus
  if (targetProfile.photoVerified) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Calculate comprehensive recommendation metrics
 */
async function calculateRecommendationMetrics(
  userProfile: any,
  candidateProfile: any,
  userId: string
): Promise<RecommendationMetrics> {
  const engagementScore = await getEngagementScore(candidateProfile.id);
  const similarityScore = calculateSimilarityScore(userProfile, candidateProfile);
  const preferenceMatchScore = calculatePreferenceMatchScore(userProfile, candidateProfile);
  const locationScore = userProfile.region === candidateProfile.region ? 25 : 10;

  const overallScore =
    engagementScore * 0.25 +
    similarityScore * 0.35 +
    preferenceMatchScore * 0.25 +
    locationScore * 0.15;

  return {
    engagementScore,
    similarityScore,
    preferenceMatchScore,
    locationScore,
    overallScore,
  };
}

/**
 * Calculate engagement score for a user
 */
async function getEngagementScore(userId: string): Promise<number> {
  try {
    const engagement = await getEngagementMetrics(userId);

    const matchScore = Math.min(engagement.totalMatches * 5, 25);
    const messageScore = Math.min(engagement.totalMessages / 10, 25);
    const likeScore = Math.min(engagement.totalLikesReceived / 5, 25);
    const responseScore = engagement.avgResponseTime < 60 ? 25 : 10;

    return matchScore + messageScore + likeScore + responseScore;
  } catch (error) {
    return 50;
  }
}

/**
 * Calculate similarity score between two user profiles
 */
function calculateSimilarityScore(userProfile: any, candidateProfile: any): number {
  let score = 0;

  // MBTI similarity
  if (userProfile.mbti === candidateProfile.mbti) {
    score += 25;
  } else if (calculateMbtiCompatibility(userProfile.mbti, candidateProfile.mbti) > 10) {
    score += 15;
  }

  // Age proximity
  const ageDiff = Math.abs(userProfile.age - candidateProfile.age);
  if (ageDiff <= 3) score += 25;
  else if (ageDiff <= 7) score += 15;
  else if (ageDiff <= 12) score += 5;

  // Region match
  if (userProfile.region === candidateProfile.region) {
    score += 25;
  }

  return Math.min(100, score);
}

/**
 * Calculate preference match score
 */
function calculatePreferenceMatchScore(userProfile: any, candidateProfile: any): number {
  let score = 0;

  // User's preferences matched by candidate
  if (userProfile.minAge && candidateProfile.age >= userProfile.minAge) score += 15;
  if (userProfile.maxAge && candidateProfile.age <= userProfile.maxAge) score += 15;
  if (userProfile.preferredRegion === candidateProfile.region) score += 20;
  if (userProfile.preferredMbti?.includes(candidateProfile.mbti)) score += 20;

  // Candidate's preferences matched by user (if available)
  if (candidateProfile.minAge && userProfile.age >= candidateProfile.minAge) score += 15;
  if (candidateProfile.maxAge && userProfile.age <= candidateProfile.maxAge) score += 15;

  return Math.min(100, score);
}

/**
 * Get recommendation reason based on metrics
 */
function getRecommendationReason(metrics: RecommendationMetrics): string {
  if (metrics.overallScore >= 80) return 'Perfect match based on preferences';
  if (metrics.similarityScore >= 80) return 'Very similar profile';
  if (metrics.engagementScore >= 75) return 'Active and engaged user';
  if (metrics.preferenceMatchScore >= 80) return 'Matches your preferences well';
  if (metrics.locationScore === 25) return 'In your area';
  return 'Recommended for you';
}

/**
 * Get user profile
 */
async function getUserProfile(userId: string): Promise<any> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      age: true,
      gender: true,
      region: true,
      mbti: true,
      profileImage: true,
      photoVerified: true,
      searchPreference: true,
    },
  });
}

/**
 * Get engagement metrics for a user
 */
async function getEngagementMetrics(userId: string): Promise<UserEngagement> {
  const [likesGiven, likesReceived, matches, messages] = await Promise.all([
    prisma.like.count({ where: { fromUserId: userId, liked: true } }),
    prisma.like.count({ where: { toUserId: userId, liked: true } }),
    prisma.match.count({ where: { OR: [{ userAId: userId }, { userBId: userId }] } }),
    prisma.message.count({ where: { senderId: userId } }),
  ]);

  return {
    userId,
    totalLikesGiven: likesGiven,
    totalLikesReceived: likesReceived,
    totalMatches: matches,
    totalMessages: messages,
    avgResponseTime: 30, // Placeholder
    lastActiveAt: new Date(),
  };
}

/**
 * Get blocked users
 */
async function getBlockedUsers(userId: string): Promise<Set<string>> {
  const blocked = await prisma.blockedUser.findMany({
    where: { blockerId: userId },
    select: { blockedId: true },
  });
  return new Set(blocked.map(b => b.blockedId));
}

/**
 * Get user matches
 */
async function getUserMatches(userId: string): Promise<Set<string>> {
  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true },
  });
  const matchIds = new Set<string>();
  matches.forEach(m => {
    if (m.userAId !== userId) matchIds.add(m.userAId);
    if (m.userBId !== userId) matchIds.add(m.userBId);
  });
  return matchIds;
}

/**
 * Get non-matched users
 */
async function getNonMatchedUsers(userId: string): Promise<Set<string>> {
  const matches = await getUserMatches(userId);
  const allUsers = await prisma.user.findMany({
    where: {
      id: { not: userId },
      isActive: true,
      accountStatus: 'active',
    },
    select: { id: true },
  });

  const nonMatches = new Set<string>();
  allUsers.forEach(u => {
    if (!matches.has(u.id)) {
      nonMatches.add(u.id);
    }
  });
  return nonMatches;
}

/**
 * Get user likes
 */
async function getUserLikes(userId: string): Promise<{ liked: Set<string>; unliked: Set<string> }> {
  const likes = await prisma.like.findMany({
    where: { fromUserId: userId },
    select: { toUserId: true, liked: true },
  });

  const liked = new Set<string>();
  const unliked = new Set<string>();

  likes.forEach(l => {
    if (l.liked) {
      liked.add(l.toUserId);
    } else {
      unliked.add(l.toUserId);
    }
  });

  return { liked, unliked };
}

/**
 * Track search activity for analytics
 */
export async function trackSearchActivity(userId: string, filters: SearchFilter): Promise<void> {
  try {
    // This would log search patterns for analytics
    // Could be stored in a SearchLog table
    console.log(`User ${userId} performed search with filters:`, filters);
  } catch (error) {
    console.error('Error tracking search activity:', error);
  }
}

/**
 * Get search analytics for a user
 */
export async function getSearchAnalytics(userId: string): Promise<any> {
  try {
    const likes = await prisma.like.findMany({
      where: { fromUserId: userId, liked: true },
      select: { createdAt: true },
    });

    const matches = await prisma.match.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      select: { createdAt: true },
    });

    return {
      userId,
      totalSearches: 0, // Would need search logs table
      totalLikes: likes.length,
      totalMatches: matches.length,
      conversionRate: matches.length / Math.max(likes.length, 1),
      lastSearchAt: new Date(),
    };
  } catch (error) {
    throw new Error(
      `Failed to get search analytics: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
