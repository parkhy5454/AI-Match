/**
 * 사용자 매칭 및 디스커버리 시스템
 * 좋아요, 매칭, 추천 알고리즘
 */

import { prisma } from '@/lib/db'
import { logger } from '@/lib/logging'
import { generateId } from '@/lib/utils'

// 타입 정의
export interface UserLike {
  id: string
  likerId: string
  likedId: string
  compatibility: number // 0-100
  createdAt: Date
  isReverted: boolean // 좋아요 취소됨
}

export interface UserMatch {
  id: string
  userId1: string
  userId2: string
  matchedAt: Date
  status: 'pending' | 'accepted' | 'rejected' | 'archived'
  lastMessageAt?: Date
  isActive: boolean
}

export interface DiscoveryCard {
  id: string
  userId: string
  firstName: string
  lastName: string
  age: number
  gender: string
  location: {
    city: string
    country: string
    distance?: number
  }
  bio: string
  interests: string[]
  photos: {
    url: string
    thumbnailUrl: string
  }[]
  compatibilityScore: number
  commonInterests: string[]
  isLiked?: boolean
  isPassed?: boolean
}

export interface MatchStats {
  totalLikes: number
  totalMatches: number
  likesReceived: number
  matchesAccepted: number
  averageCompatibility: number
}

// 좋아요 남기기
export async function likeUser(
  likerId: string,
  likedId: string
): Promise<UserLike> {
  try {
    // 자신에게 좋아요 불가
    if (likerId === likedId) {
      throw new Error('자신에게 좋아요를 할 수 없습니다')
    }

    // 차단 상태 확인
    const isBlocked = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: likerId,
          blockedId: likedId
        }
      }
    })

    if (isBlocked) {
      throw new Error('차단된 사용자입니다')
    }

    // 이미 좋아요 했는지 확인
    const existingLike = await prisma.userLike.findFirst({
      where: {
        likerId,
        likedId,
        isReverted: false
      }
    })

    if (existingLike) {
      throw new Error('이미 좋아요를 했습니다')
    }

    // 호환성 점수 계산
    const compatibility = await calculateCompatibility(likerId, likedId)

    const like = await prisma.userLike.create({
      data: {
        likerId,
        likedId,
        compatibility,
        isReverted: false
      }
    })

    // 상호 좋아요 시 매칭 생성
    const mutualLike = await prisma.userLike.findFirst({
      where: {
        likerId: likedId,
        likedId: likerId,
        isReverted: false
      }
    })

    if (mutualLike) {
      await createMatch(likerId, likedId)
    }

    logger.info('좋아요 남김', {
      likerId,
      likedId,
      compatibility
    })

    return like as UserLike
  } catch (error) {
    logger.error('좋아요 오류', {
      likerId,
      likedId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 좋아요 취소
export async function unlikeUser(
  likerId: string,
  likedId: string
): Promise<boolean> {
  try {
    const like = await prisma.userLike.findFirst({
      where: {
        likerId,
        likedId,
        isReverted: false
      }
    })

    if (!like) throw new Error('좋아요 기록을 찾을 수 없습니다')

    // 좋아요 취소 처리
    await prisma.userLike.update({
      where: { id: like.id },
      data: { isReverted: true }
    })

    // 매칭 상태 변경 (매칭이 있었다면)
    const match = await prisma.userMatch.findFirst({
      where: {
        OR: [
          { userId1: likerId, userId2: likedId },
          { userId1: likedId, userId2: likerId }
        ],
        isActive: true
      }
    })

    if (match) {
      await prisma.userMatch.update({
        where: { id: match.id },
        data: { isActive: false }
      })
    }

    logger.info('좋아요 취소', { likerId, likedId })

    return true
  } catch (error) {
    logger.error('좋아요 취소 오류', {
      likerId,
      likedId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 호환성 점수 계산
export async function calculateCompatibility(
  userId1: string,
  userId2: string
): Promise<number> {
  try {
    const profile1 = await prisma.userProfile.findUnique({
      where: { userId: userId1 }
    })

    const profile2 = await prisma.userProfile.findUnique({
      where: { userId: userId2 }
    })

    if (!profile1 || !profile2) return 0

    let score = 50 // 기본 점수

    // 나이 호환성 (가중치: 15%)
    const ageDiff = Math.abs(profile1.age - profile2.age)
    if (ageDiff <= 5) {
      score += 15
    } else if (ageDiff <= 10) {
      score += 10
    } else if (ageDiff <= 15) {
      score += 5
    }

    // 위치 호환성 (가중치: 15%)
    const distance = calculateDistance(
      profile1.location as any,
      profile2.location as any
    )
    if (distance <= 10) {
      score += 15
    } else if (distance <= 30) {
      score += 10
    } else if (distance <= 50) {
      score += 5
    }

    // 관심사 호환성 (가중치: 30%)
    const commonInterests = profile1.interests.filter(i =>
      profile2.interests.includes(i)
    )
    const interestScore = (commonInterests.length / Math.max(profile1.interests.length, profile2.interests.length, 1)) * 30
    score += Math.min(interestScore, 30)

    // 관계 목표 호환성 (가중치: 20%)
    if (profile1.relationshipGoal === profile2.relationshipGoal) {
      score += 20
    } else if (
      (profile1.relationshipGoal === 'dating' && profile2.relationshipGoal === 'relationship') ||
      (profile1.relationshipGoal === 'relationship' && profile2.relationshipGoal === 'dating')
    ) {
      score += 10
    }

    // 프로필 완성도 보너스 (가중치: 10%)
    if (profile1.profileCompletion >= 80 && profile2.profileCompletion >= 80) {
      score += 10
    } else if (profile1.profileCompletion >= 60 && profile2.profileCompletion >= 60) {
      score += 5
    }

    return Math.min(100, score)
  } catch (error) {
    logger.error('호환성 계산 오류', {
      userId1,
      userId2,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return 0
  }
}

// 거리 계산 (하버사인 공식)
function calculateDistance(
  loc1: { latitude: number; longitude: number },
  loc2: { latitude: number; longitude: number }
): number {
  const R = 6371 // 지구 반지름 (km)
  const dLat = toRad(loc2.latitude - loc1.latitude)
  const dLon = toRad(loc2.longitude - loc1.longitude)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.latitude)) *
      Math.cos(toRad(loc2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// 매칭 생성
async function createMatch(userId1: string, userId2: string): Promise<UserMatch> {
  try {
    // 기존 매칭 확인
    const existingMatch = await prisma.userMatch.findFirst({
      where: {
        OR: [
          { userId1, userId2 },
          { userId1: userId2, userId2: userId1 }
        ]
      }
    })

    if (existingMatch) {
      if (!existingMatch.isActive) {
        await prisma.userMatch.update({
          where: { id: existingMatch.id },
          data: { isActive: true, matchedAt: new Date() }
        })
        return existingMatch as UserMatch
      }
      return existingMatch as UserMatch
    }

    const match = await prisma.userMatch.create({
      data: {
        userId1,
        userId2,
        status: 'accepted',
        isActive: true
      }
    })

    logger.info('매칭 생성', { userId1, userId2 })

    return match as UserMatch
  } catch (error) {
    logger.error('매칭 생성 오류', {
      userId1,
      userId2,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 매칭 조회
export async function getMatches(
  userId: string,
  status?: string,
  limit: number = 50,
  offset: number = 0
): Promise<UserMatch[]> {
  try {
    const matches = await prisma.userMatch.findMany({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }],
        isActive: true,
        ...(status && { status })
      },
      orderBy: { matchedAt: 'desc' },
      take: limit,
      skip: offset
    })

    return matches as UserMatch[]
  } catch (error) {
    logger.error('매칭 조회 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 좋아요 목록
export async function getLikes(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<UserLike[]> {
  try {
    const likes = await prisma.userLike.findMany({
      where: {
        likerId: userId,
        isReverted: false
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    return likes as UserLike[]
  } catch (error) {
    logger.error('좋아요 목록 조회 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 받은 좋아요 목록
export async function getReceivedLikes(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<UserLike[]> {
  try {
    const likes = await prisma.userLike.findMany({
      where: {
        likedId: userId,
        isReverted: false
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    return likes as UserLike[]
  } catch (error) {
    logger.error('받은 좋아요 조회 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 디스커버리 피드 생성
export async function getDiscoveryFeed(
  userId: string,
  filters?: {
    minAge?: number
    maxAge?: number
    gender?: string
    maxDistance?: number
    interests?: string[]
  },
  limit: number = 20,
  offset: number = 0
): Promise<DiscoveryCard[]> {
  try {
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId }
    })

    if (!userProfile) throw new Error('사용자 프로필을 찾을 수 없습니다')

    // 차단 사용자 목록
    const blockedUsers = await prisma.block.findMany({
      where: {
        OR: [
          { blockerId: userId },
          { blockedId: userId }
        ]
      }
    })

    const blockedUserIds = new Set(
      blockedUsers.flatMap(b => [b.blockerId, b.blockedId])
    )

    // 이미 좋아요/패스한 사용자
    const likedUsers = await prisma.userLike.findMany({
      where: { likerId: userId }
    })

    const likedUserIds = new Set(likedUsers.map(l => l.likedId))

    // 프로필 검색
    const profiles = await prisma.userProfile.findMany({
      where: {
        isPublic: true,
        userId: { not: userId },
        age: {
          gte: filters?.minAge || 18,
          lte: filters?.maxAge || 100
        },
        ...(filters?.gender && { gender: filters.gender })
      },
      include: {
        photos: {
          orderBy: { order: 'asc' },
          take: 5
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: limit + offset,
      skip: offset
    })

    // 카드 생성
    const cards: DiscoveryCard[] = []

    for (const profile of profiles) {
      if (blockedUserIds.has(profile.userId)) continue
      if (likedUserIds.has(profile.userId)) continue

      const compatibility = await calculateCompatibility(userId, profile.userId)
      const commonInterests = profile.interests.filter(i =>
        userProfile.interests.includes(i)
      )

      cards.push({
        id: profile.id,
        userId: profile.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        age: profile.age,
        gender: profile.gender,
        location: {
          city: (profile.location as any).city,
          country: (profile.location as any).country,
          distance: calculateDistance(
            userProfile.location as any,
            profile.location as any
          )
        },
        bio: profile.bio,
        interests: profile.interests,
        photos: profile.photos.map(p => ({
          url: p.photoUrl,
          thumbnailUrl: p.thumbnailUrl
        })),
        compatibilityScore: compatibility,
        commonInterests
      })
    }

    return cards.slice(0, limit)
  } catch (error) {
    logger.error('디스커버리 피드 생성 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 매칭 통계
export async function getMatchingStats(userId: string): Promise<MatchStats> {
  try {
    const totalLikes = await prisma.userLike.count({
      where: {
        likerId: userId,
        isReverted: false
      }
    })

    const likesReceived = await prisma.userLike.count({
      where: {
        likedId: userId,
        isReverted: false
      }
    })

    const matches = await prisma.userMatch.findMany({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }],
        isActive: true
      }
    })

    const totalMatches = matches.length

    const matchesAccepted = matches.filter(
      m => m.status === 'accepted'
    ).length

    // 평균 호환성 계산
    const likes = await prisma.userLike.findMany({
      where: {
        likerId: userId,
        isReverted: false
      }
    })

    const averageCompatibility =
      likes.length > 0
        ? likes.reduce((sum, like) => sum + like.compatibility, 0) / likes.length
        : 0

    return {
      totalLikes,
      totalMatches,
      likesReceived,
      matchesAccepted,
      averageCompatibility: Math.round(averageCompatibility)
    }
  } catch (error) {
    logger.error('매칭 통계 조회 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 선호도 기반 추천
export async function getRecommendations(
  userId: string,
  limit: number = 10
): Promise<DiscoveryCard[]> {
  try {
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId }
    })

    if (!userProfile) throw new Error('사용자 프로필을 찾을 수 없습니다')

    const lookingFor = (userProfile.lookingFor as any) || {}

    return getDiscoveryFeed(userId, {
      minAge: lookingFor.minAge || 18,
      maxAge: lookingFor.maxAge || 100,
      maxDistance: lookingFor.maxDistance || 50
    }, limit, 0)
  } catch (error) {
    logger.error('추천 조회 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}
