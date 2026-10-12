/**
 * MBTI 기반 사용자 매칭 알고리즘
 * AI를 활용한 지능형 매칭 시스템
 */

import { db } from './db'
import { logger } from './logging'

/**
 * MBTI 성격 유형
 */
export type MBTIType =
  | 'ISTJ'
  | 'ISFJ'
  | 'INFJ'
  | 'INTJ'
  | 'ISTP'
  | 'ISFP'
  | 'INFP'
  | 'INTP'
  | 'ESTP'
  | 'ESFP'
  | 'ENFP'
  | 'ENTP'
  | 'ESTJ'
  | 'ESFJ'
  | 'ENFJ'
  | 'ENTJ'

interface MatchingCriteria {
  userId: string
  minAge?: number
  maxAge?: number
  location?: string
  mbtiType?: string
  excludedUserIds?: string[]
  limit?: number
  offset?: number
}

interface MatchScore {
  userId: string
  username: string
  profileImage?: string
  age: number
  location: string
  mbtiType: string
  bio?: string
  matchScore: number
  compatibilityReasons: string[]
}

/**
 * MBTI 호환성 점수 계산
 * 같은 그룹 내의 유형이 더 높은 점수를 받음
 */
function calculateMBTICompatibility(
  mbti1: string,
  mbti2: string
): number {
  // 같은 타입: 100점
  if (mbti1 === mbti2) return 100

  // 4글자 중 3글자 일치: 85점
  let matchCount = 0
  for (let i = 0; i < 4; i++) {
    if (mbti1[i] === mbti2[i]) matchCount++
  }

  if (matchCount === 3) return 85

  // 4글자 중 2글자 일치: 70점
  if (matchCount === 2) return 70

  // 4글자 중 1글자 일치: 50점
  if (matchCount === 1) return 50

  // 완전히 다름: 30점
  return 30
}

/**
 * 나이 호환성 점수 계산
 * 5살 차이: 100점
 * 10살 차이: 80점
 * 20살 차이: 50점
 */
function calculateAgeCompatibility(age1: number, age2: number): number {
  const ageDiff = Math.abs(age1 - age2)

  if (ageDiff <= 5) return 100
  if (ageDiff <= 10) return 80
  if (ageDiff <= 15) return 60
  if (ageDiff <= 20) return 40
  if (ageDiff <= 25) return 20
  return 0
}

/**
 * 지역 호환성 점수 계산
 * 같은 지역: 100점
 * 인접 지역: 80점
 * 다른 지역: 40점
 */
function calculateLocationCompatibility(loc1: string, loc2: string): number {
  if (loc1 === loc2) return 100

  // 간단한 지역 인접성 검사
  // 실제로는 더 복잡한 로직이 필요할 수 있음
  const adjacentRegions: { [key: string]: string[] } = {
    서울: ['경기', '인천'],
    경기: ['서울', '인천', '강원'],
    인천: ['서울', '경기'],
    부산: ['울산', '경남'],
    대구: ['경북', '경남'],
    대전: ['충남', '충북'],
    광주: ['전남', '전북'],
    울산: ['부산', '경남'],
    강원: ['경기', '충북'],
    충북: ['충남', '강원', '경북'],
    충남: ['충북', '대전', '전북'],
    전북: ['충남', '광주', '전남'],
    전남: ['광주', '전북'],
    경북: ['대구', '충북'],
    경남: ['부산', '울산', '대구'],
  }

  const adjacents = adjacentRegions[loc1] || []
  if (adjacents.includes(loc2)) return 80

  return 40
}

/**
 * 종합 매칭 점수 계산
 * MBTI: 40%
 * 나이: 30%
 * 지역: 30%
 */
function calculateTotalMatchScore(
  mbtiScore: number,
  ageScore: number,
  locationScore: number
): number {
  return Math.round(
    mbtiScore * 0.4 + ageScore * 0.3 + locationScore * 0.3
  )
}

/**
 * 호환성 이유 생성
 */
function generateCompatibilityReasons(
  mbtiScore: number,
  ageScore: number,
  locationScore: number,
  myMBTI: string,
  otherMBTI: string,
  myAge: number,
  otherAge: number
): string[] {
  const reasons: string[] = []

  // MBTI 호환성
  if (mbtiScore >= 85) {
    reasons.push(`성격 유형이 잘 맞습니다 (${otherMBTI})`)
  } else if (mbtiScore >= 70) {
    reasons.push(`성격이 비슷한 부분이 있습니다`)
  }

  // 나이 호환성
  if (ageScore >= 100) {
    reasons.push(`비슷한 나이입니다 (${otherAge}세)`)
  } else if (ageScore >= 80) {
    reasons.push(`나이가 비슷합니다`)
  }

  // 지역 호환성
  if (locationScore >= 100) {
    reasons.push(`같은 지역에 살고 있습니다`)
  } else if (locationScore >= 80) {
    reasons.push(`인접한 지역에 살고 있습니다`)
  }

  return reasons
}

/**
 * 사용자에게 매칭 추천 반환
 */
export async function getMatchingRecommendations(
  criteria: MatchingCriteria
): Promise<MatchScore[]> {
  try {
    const {
      userId,
      minAge = 18,
      maxAge = 99,
      location,
      excludedUserIds = [],
      limit = 20,
      offset = 0,
    } = criteria

    // 현재 사용자 정보 조회
    const currentUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        age: true,
        location: true,
        mbtiType: true,
        gender: true,
      },
    })

    if (!currentUser || !currentUser.mbtiType) {
      return []
    }

    // 제외된 사용자 ID (이미 좋아요 한 사람, 매칭된 사람 등)
    const excludeSet = new Set([userId, ...excludedUserIds])

    // 매칭 대상 사용자 조회
    const candidates = await db.user.findMany({
      where: {
        id: { notIn: Array.from(excludeSet) },
        age: { gte: minAge, lte: maxAge },
        location: location || undefined,
        photoVerified: true, // 사진 검증된 사용자만
        mbtiType: { not: null },
      },
      select: {
        id: true,
        username: true,
        profileImage: true,
        age: true,
        location: true,
        mbtiType: true,
        bio: true,
      },
      take: limit * 3, // 필터링을 위해 더 많이 조회
    })

    // 매칭 점수 계산
    const matches: MatchScore[] = candidates
      .map((candidate) => {
        const mbtiScore = calculateMBTICompatibility(
          currentUser.mbtiType!,
          candidate.mbtiType!
        )
        const ageScore = calculateAgeCompatibility(
          currentUser.age,
          candidate.age
        )
        const locationScore = calculateLocationCompatibility(
          currentUser.location,
          candidate.location
        )

        const totalScore = calculateTotalMatchScore(
          mbtiScore,
          ageScore,
          locationScore
        )

        return {
          userId: candidate.id,
          username: candidate.username,
          profileImage: candidate.profileImage || undefined,
          age: candidate.age,
          location: candidate.location,
          mbtiType: candidate.mbtiType!,
          bio: candidate.bio || undefined,
          matchScore: totalScore,
          compatibilityReasons: generateCompatibilityReasons(
            mbtiScore,
            ageScore,
            locationScore,
            currentUser.mbtiType!,
            candidate.mbtiType!,
            currentUser.age,
            candidate.age
          ),
        }
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit)

    logger.info('매칭 추천 생성', {
      userId,
      candidateCount: candidates.length,
      resultCount: matches.length,
    })

    return matches
  } catch (error) {
    logger.error('매칭 추천 생성 실패', {
      userId: criteria.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return []
  }
}

/**
 * 사용자가 좋아요를 한 사람들 제외
 */
export async function getExcludedUserIds(userId: string): Promise<string[]> {
  try {
    const likes = await db.like.findMany({
      where: { fromUserId: userId },
      select: { toUserId: true },
    })

    const matches = await db.match.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
      },
      select: {
        user1Id: true,
        user2Id: true,
      },
    })

    const excludedIds = new Set<string>()

    // 좋아요한 사람들 추가
    likes.forEach((like) => {
      excludedIds.add(like.toUserId)
    })

    // 매칭된 사람들 추가
    matches.forEach((match) => {
      excludedIds.add(match.user1Id === userId ? match.user2Id : match.user1Id)
    })

    return Array.from(excludedIds)
  } catch (error) {
    logger.error('제외 사용자 목록 조회 실패', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return []
  }
}

/**
 * MBTI 호환성 분석
 */
export function analyzeMBTICompatibility(
  mbti1: string,
  mbti2: string
): {
  score: number
  description: string
  strengthPoints: string[]
  improvementPoints: string[]
} {
  const score = calculateMBTICompatibility(mbti1, mbti2)

  let description = ''
  let strengthPoints: string[] = []
  let improvementPoints: string[] = []

  if (score === 100) {
    description = '완벽한 성격 일치'
    strengthPoints = [
      '의사소통 방식이 일치',
      '가치관이 유사',
      '생활 방식이 비슷',
    ]
  } else if (score >= 85) {
    description = '성격이 매우 잘 맞음'
    strengthPoints = ['거의 모든 성격 특성이 일치', '상호 이해도가 높음']
  } else if (score >= 70) {
    description = '성격이 잘 맞음'
    strengthPoints = ['주요 성격 특성이 일치']
    improvementPoints = ['일부 차이점을 보완할 수 있음']
  } else if (score >= 50) {
    description = '성격에 차이가 있지만 보완 가능'
    strengthPoints = ['서로 다른 관점을 배울 수 있음']
    improvementPoints = ['의사소통을 더 주의깊게 해야 함']
  } else {
    description = '성격이 상당히 다름'
    strengthPoints = ['새로운 관점을 발견할 수 있음']
    improvementPoints = [
      '성격의 차이를 이해하고 존중해야 함',
      '적극적인 소통이 필요',
    ]
  }

  return {
    score,
    description,
    strengthPoints,
    improvementPoints,
  }
}
