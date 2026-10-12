/**
 * 사용자 검색 API
 * GET: 사용자 검색
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import {
  searchUsers,
  recordUserView,
  getSearchSuggestions,
  SearchFilters,
} from '@/lib/search-engine'
import { logger } from '@/lib/logging'

/**
 * GET /api/users/search?keyword=&minAge=&maxAge=&location=&mbtiType=&limit=50&offset=0
 * 사용자 검색
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다' },
        { status: 401 }
      )
    }

    const decoded = verifyJWT(token)
    if (!decoded || !decoded.sub) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const userId = decoded.sub
    const searchParams = request.nextUrl.searchParams

    // 쿼리 파라미터 파싱
    const filters: SearchFilters = {
      keyword: searchParams.get('keyword') || undefined,
      minAge: searchParams.get('minAge')
        ? parseInt(searchParams.get('minAge')!)
        : undefined,
      maxAge: searchParams.get('maxAge')
        ? parseInt(searchParams.get('maxAge')!)
        : undefined,
      location: searchParams.get('location') || undefined,
      mbtiType: searchParams.get('mbtiType') || undefined,
      gender: (searchParams.get('gender') as 'M' | 'F') || undefined,
      verified:
        searchParams.get('verified') === 'true'
          ? true
          : searchParams.get('verified') === 'false'
            ? false
            : undefined,
      limit: Math.min(
        parseInt(searchParams.get('limit') || '50'),
        100
      ),
      offset: parseInt(searchParams.get('offset') || '0') || 0,
    }

    // 입력 검증
    if (filters.minAge && filters.minAge < 18) {
      return NextResponse.json(
        { error: '최소 나이는 18세 이상이어야 합니다' },
        { status: 400 }
      )
    }

    if (
      filters.minAge &&
      filters.maxAge &&
      filters.minAge > filters.maxAge
    ) {
      return NextResponse.json(
        { error: '최소 나이가 최대 나이보다 클 수 없습니다' },
        { status: 400 }
      )
    }

    // 검색 실행
    const result = await searchUsers(userId, filters)

    logger.info('사용자 검색 API 호출 성공', {
      userId,
      resultCount: result.results.length,
      filters,
    })

    return NextResponse.json({
      success: true,
      data: result.results,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
      },
    })
  } catch (error) {
    logger.error('사용자 검색 API 오류', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      { error: '검색 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users/search/view
 * 사용자 프로필 조회 기록
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다' },
        { status: 401 }
      )
    }

    const decoded = verifyJWT(token)
    if (!decoded || !decoded.sub) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const userId = decoded.sub
    const { viewedUserId } = await request.json()

    if (!viewedUserId) {
      return NextResponse.json(
        { error: '조회할 사용자 ID가 필요합니다' },
        { status: 400 }
      )
    }

    if (userId === viewedUserId) {
      return NextResponse.json(
        { error: '자신의 프로필은 조회 기록에 저장되지 않습니다' },
        { status: 400 }
      )
    }

    await recordUserView(userId, viewedUserId)

    logger.info('프로필 조회 기록 저장', {
      viewerId: userId,
      viewedUserId,
    })

    return NextResponse.json({
      success: true,
      message: '프로필 조회가 기록되었습니다',
    })
  } catch (error) {
    logger.error('프로필 조회 기록 API 오류', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      { error: '조회 기록 저장 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
