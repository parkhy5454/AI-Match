/**
 * 사용자 검색 엔진
 * 고급 필터링 및 검색 기능
 */

import { db } from './db'
import { logger } from './logging'

/**
 * 검색 필터 타입
 */
export interface SearchFilters {
  keyword?: string // 닉네임, 자기소개에서 검색
  minAge?: number
  maxAge?: number
  location?: string
  mbtiType?: string
  gender?: 'M' | 'F'
  verified?: boolean // 사진 검증 완료 여부
  limit?: number
  offset?: number
}

/**
 * 검색 결과 타입
 */
export interface SearchResult {
  id: string
  username: string
  age: number
  location: string
  profileImage?: string
  mbtiType: string
  bio?: string
  verified: boolean
  matchScore?: number // 기존 매칭 점수가 있으면 포함
}

/**
 * 검색 이력 타입
 */
export interface SearchHistory {
  id: string
  userId: string
  query: string
  filters: Record<string, any>
  resultCount: number
  createdAt: Date
}

/**
 * 최근 조회 타입
 */
export interface RecentView {
  viewedUserId: string
  viewedUser: {
    id: string
    username: string
    profileImage?: string
    age: number
    location: string
  }
  viewedAt: Date
}

/**
 * 검색 쿼리 빌더
 */
class SearchQueryBuilder {
  private filters: SearchFilters

  constructor(filters: SearchFilters) {
    this.filters = filters
  }

  /**
   * Prisma where 조건 생성
   */
  buildWhereClause(): Record<string, any> {
    const where: Record<string, any> = {}

    // 키워드 검색 (닉네임, 자기소개)
    if (this.filters.keyword) {
      where.OR = [
        {
          username: {
            contains: this.filters.keyword,
            mode: 'insensitive',
          },
        },
        {
          bio: {
            contains: this.filters.keyword,
            mode: 'insensitive',
          },
        },
      ]
    }

    // 연령대 필터
    if (this.filters.minAge || this.filters.maxAge) {
      where.age = {}
      if (this.filters.minAge) {
        where.age.gte = this.filters.minAge
      }
      if (this.filters.maxAge) {
        where.age.lte = this.filters.maxAge
      }
    }

    // 위치 필터
    if (this.filters.location) {
      where.location = {
        contains: this.filters.location,
        mode: 'insensitive',
      }
    }

    // MBTI 필터
    if (this.filters.mbtiType) {
      where.mbtiType = this.filters.mbtiType
    }

    // 성별 필터
    if (this.filters.gender) {
      where.gender = this.filters.gender
    }

    // 검증 필터
    if (this.filters.verified !== undefined) {
      where.profileVerified = this.filters.verified
    }

    return where
  }

  /**
   * 정렬 옵션 생성
   */
  buildOrderBy(): Record<string, any> {
    // 기본 정렬: 최근 활동, 프로필 완성도
    return {
      lastSeenAt: 'desc', // 최근 활동순
    }
  }

  /**
   * 페이지네이션 옵션
   */
  getPagination(): { skip: number; take: number } {
    const limit = Math.min(this.filters.limit || 50, 100)
    const offset = this.filters.offset || 0

    return {
      skip: offset,
      take: limit,
    }
  }
}

/**
 * 사용자 검색 수행
 */
export async function searchUsers(
  userId: string,
  filters: SearchFilters
): Promise<{
  results: SearchResult[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}> {
  try {
    // 검색 쿼리 빌더
    const builder = new SearchQueryBuilder(filters)
    const whereClause = builder.buildWhereClause()
    const orderBy = builder.buildOrderBy()
    const pagination = builder.getPagination()

    // 차단된 사용자 제외
    const { getAccessibleUserIds } = await import('./blocking-system')
    const blockedUserIds = await getAccessibleUserIds(userId)

    if (blockedUserIds.size > 0) {
      whereClause.id = {
        notIn: Array.from(blockedUserIds),
      }
    }

    // 자신 제외
    whereClause.id = {
      ...whereClause.id,
      not: userId,
    }

    // 검색 실행
    const [results, total] = await Promise.all([
      db.user.findMany({
        where: whereClause,
        orderBy,
        select: {
          id: true,
          username: true,
          age: true,
          location: true,
          profileImage: true,
          mbtiType: true,
          bio: true,
          profileVerified: true,
        },
        ...pagination,
      }),
      db.user.count({ where: whereClause }),
    ])

    // 검색 이력 저장 (비동기)
    saveSearchHistory(userId, filters, total).catch((error) => {
      logger.error('검색 이력 저장 실패', { error })
    })

    // 응답 구성
    const limit = pagination.take
    const offset = pagination.skip
    const hasMore = offset + limit < total

    logger.info('사용자 검색 수행', {
      userId,
      filters,
      resultCount: results.length,
      total,
    })

    return {
      results: results.map((u) => ({
        id: u.id,
        username: u.username,
        age: u.age,
        location: u.location,
        profileImage: u.profileImage || undefined,
        mbtiType: u.mbtiType,
        bio: u.bio || undefined,
        verified: u.profileVerified,
      })),
      total,
      limit,
      offset,
      hasMore,
    }
  } catch (error) {
    logger.error('사용자 검색 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 검색 이력 저장
 */
async function saveSearchHistory(
  userId: string,
  filters: SearchFilters,
  resultCount: number
): Promise<void> {
  try {
    // 최근 100개 검색 이력만 유지
    const recentSearches = await db.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 99,
      select: { id: true },
    })

    // 새 검색 저장
    await db.searchHistory.create({
      data: {
        userId,
        query: filters.keyword || '',
        filters: JSON.stringify(filters),
        resultCount,
      },
    })
  } catch (error) {
    logger.error('검색 이력 저장 실패', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 검색 이력 조회
 */
export async function getSearchHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  history: SearchHistory[]
  total: number
}> {
  try {
    const [history, total] = await Promise.all([
      db.searchHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: Math.min(limit, 100),
      }),
      db.searchHistory.count({
        where: { userId },
      }),
    ])

    logger.info('검색 이력 조회', {
      userId,
      count: history.length,
    })

    return {
      history: history.map((h) => ({
        id: h.id,
        userId: h.userId,
        query: h.query,
        filters: JSON.parse(h.filters),
        resultCount: h.resultCount,
        createdAt: h.createdAt,
      })),
      total,
    }
  } catch (error) {
    logger.error('검색 이력 조회 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 검색 이력 삭제
 */
export async function deleteSearchHistory(
  userId: string,
  historyId: string
): Promise<boolean> {
  try {
    const result = await db.searchHistory.deleteMany({
      where: {
        id: historyId,
        userId, // 자신의 이력만 삭제 가능
      },
    })

    logger.info('검색 이력 삭제', {
      userId,
      historyId,
    })

    return result.count > 0
  } catch (error) {
    logger.error('검색 이력 삭제 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}

/**
 * 모든 검색 이력 삭제
 */
export async function clearSearchHistory(userId: string): Promise<number> {
  try {
    const result = await db.searchHistory.deleteMany({
      where: { userId },
    })

    logger.info('모든 검색 이력 삭제', {
      userId,
      count: result.count,
    })

    return result.count
  } catch (error) {
    logger.error('검색 이력 삭제 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return 0
  }
}

/**
 * 사용자 프로필 조회 기록
 */
export async function recordUserView(
  viewerId: string,
  viewedUserId: string
): Promise<void> {
  try {
    if (viewerId === viewedUserId) {
      return // 자신의 프로필 조회는 기록하지 않음
    }

    // 기존 레코드가 있으면 업데이트, 없으면 생성
    await db.userView.upsert({
      where: {
        viewerId_viewedUserId: {
          viewerId,
          viewedUserId,
        },
      },
      update: {
        viewedAt: new Date(),
      },
      create: {
        viewerId,
        viewedUserId,
        viewedAt: new Date(),
      },
    })

    logger.info('사용자 프로필 조회 기록', {
      viewerId,
      viewedUserId,
    })
  } catch (error) {
    logger.error('프로필 조회 기록 실패', {
      viewerId,
      viewedUserId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 최근 조회 사용자 목록
 */
export async function getRecentViews(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  views: RecentView[]
  total: number
}> {
  try {
    const [views, total] = await Promise.all([
      db.userView.findMany({
        where: { viewerId: userId },
        include: {
          viewedUser: {
            select: {
              id: true,
              username: true,
              profileImage: true,
              age: true,
              location: true,
            },
          },
        },
        orderBy: { viewedAt: 'desc' },
        skip: offset,
        take: Math.min(limit, 100),
      }),
      db.userView.count({
        where: { viewerId: userId },
      }),
    ])

    logger.info('최근 조회 목록 조회', {
      userId,
      count: views.length,
    })

    return {
      views: views.map((v) => ({
        viewedUserId: v.viewedUserId,
        viewedUser: v.viewedUser,
        viewedAt: v.viewedAt,
      })),
      total,
    }
  } catch (error) {
    logger.error('최근 조회 목록 조회 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 나를 최근에 조회한 사용자 목록
 */
export async function getWhoViewedMe(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  viewers: Array<{
    viewerId: string
    viewerUser: {
      id: string
      username: string
      profileImage?: string
    }
    viewedAt: Date
  }>
  total: number
}> {
  try {
    const [viewers, total] = await Promise.all([
      db.userView.findMany({
        where: { viewedUserId: userId },
        include: {
          viewerUser: {
            select: {
              id: true,
              username: true,
              profileImage: true,
            },
          },
        },
        orderBy: { viewedAt: 'desc' },
        skip: offset,
        take: Math.min(limit, 100),
      }),
      db.userView.count({
        where: { viewedUserId: userId },
      }),
    ])

    logger.info('나를 조회한 사용자 목록 조회', {
      userId,
      count: viewers.length,
    })

    return {
      viewers: viewers.map((v) => ({
        viewerId: v.viewerId,
        viewerUser: v.viewerUser,
        viewedAt: v.viewedAt,
      })),
      total,
    }
  } catch (error) {
    logger.error('나를 조회한 사용자 목록 조회 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 검색 제안 (자동완성)
 */
export async function getSearchSuggestions(
  keyword: string,
  limit: number = 10
): Promise<Array<{ username: string; count: number }>> {
  try {
    if (!keyword || keyword.length < 2) {
      return []
    }

    // 일치하는 사용자명 제안
    const suggestions = await db.user.findMany({
      where: {
        username: {
          contains: keyword,
          mode: 'insensitive',
        },
      },
      select: {
        username: true,
      },
      take: limit,
    })

    return suggestions.map((s) => ({
      username: s.username,
      count: 0, // 실제로는 검색 빈도를 저장할 수 있음
    }))
  } catch (error) {
    logger.error('검색 제안 생성 오류', {
      keyword,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return []
  }
}

/**
 * 인기 검색어 (대시보드용)
 */
export async function getPopularSearches(
  days: number = 7
): Promise<Array<{ query: string; count: number }>> {
  try {
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)

    // 실제로는 Redis나 ElasticSearch를 사용하는 것이 좋음
    const searches = await db.searchHistory.groupBy({
      by: ['query'],
      where: {
        createdAt: { gte: sinceDate },
      },
      _count: true,
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 20,
    })

    return searches.map((s) => ({
      query: s.query,
      count: s._count.id,
    }))
  } catch (error) {
    logger.error('인기 검색어 조회 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return []
  }
}
