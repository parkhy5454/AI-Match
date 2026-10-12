/**
 * 매칭 추천 API
 * GET /api/discover/recommendations?minAge=20&maxAge=30&location=서울&limit=20
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logging'
import { verifyJWT } from '@/lib/auth'
import {
  getMatchingRecommendations,
  getExcludedUserIds,
} from '@/lib/matching-algorithm'

export async function GET(request: NextRequest) {
  try {
    // JWT 인증
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { success: false, error: '인증 토큰이 필요합니다' },
        { status: 401 }
      )
    }

    const decoded = verifyJWT(token)
    if (!decoded?.sub) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const userId = decoded.sub

    // 쿼리 파라미터 추출
    const searchParams = request.nextUrl.searchParams
    const minAge = searchParams.get('minAge')
      ? parseInt(searchParams.get('minAge')!)
      : 18
    const maxAge = searchParams.get('maxAge')
      ? parseInt(searchParams.get('maxAge')!)
      : 99
    const location = searchParams.get('location') || undefined
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 20
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0

    // 입력 검증
    if (minAge < 18 || maxAge > 99 || minAge > maxAge) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 나이 범위입니다' },
        { status: 400 }
      )
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: '제한은 1~100 사이여야 합니다' },
        { status: 400 }
      )
    }

    // 제외 사용자 ID 조회 (이미 좋아요한 사람, 매칭된 사람)
    const excludedUserIds = await getExcludedUserIds(userId)

    // 매칭 추천 생성
    const recommendations = await getMatchingRecommendations({
      userId,
      minAge,
      maxAge,
      location,
      excludedUserIds,
      limit,
      offset,
    })

    logger.info('매칭 추천 조회', {
      userId,
      minAge,
      maxAge,
      location,
      count: recommendations.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        recommendations,
        count: recommendations.length,
        pagination: {
          limit,
          offset,
          hasMore: recommendations.length === limit,
        },
      },
      message: '추천 사용자 조회 성공',
    })
  } catch (error) {
    logger.error('매칭 추천 조회 실패', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      {
        success: false,
        error: '매칭 추천 조회 중 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}
