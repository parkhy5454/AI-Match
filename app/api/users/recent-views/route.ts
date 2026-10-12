/**
 * 최근 조회 API
 * GET: 내가 조회한 사용자 또는 나를 조회한 사용자
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { getRecentViews, getWhoViewedMe } from '@/lib/search-engine'
import { logger } from '@/lib/logging'

/**
 * GET /api/users/recent-views?type=viewed&limit=20&offset=0
 * type: 'viewed' (내가 조회) 또는 'viewers' (나를 조회한 사람)
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
    const type = searchParams.get('type') || 'viewed'
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '20'),
      100
    )
    const offset = parseInt(searchParams.get('offset') || '0') || 0

    if (type === 'viewed') {
      // 내가 조회한 사용자
      const result = await getRecentViews(userId, limit, offset)

      logger.info('내가 조회한 사용자 목록 조회', {
        userId,
        count: result.views.length,
      })

      return NextResponse.json({
        success: true,
        data: result.views.map((v) => ({
          userId: v.viewedUserId,
          user: v.viewedUser,
          viewedAt: v.viewedAt,
        })),
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + limit < result.total,
        },
      })
    } else if (type === 'viewers') {
      // 나를 조회한 사용자
      const result = await getWhoViewedMe(userId, limit, offset)

      logger.info('나를 조회한 사용자 목록 조회', {
        userId,
        count: result.viewers.length,
      })

      return NextResponse.json({
        success: true,
        data: result.viewers.map((v) => ({
          userId: v.viewerId,
          user: v.viewerUser,
          viewedAt: v.viewedAt,
        })),
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + limit < result.total,
        },
      })
    } else {
      return NextResponse.json(
        { error: 'type은 "viewed" 또는 "viewers"여야 합니다' },
        { status: 400 }
      )
    }
  } catch (error) {
    logger.error('최근 조회 조회 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      { error: '최근 조회 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
