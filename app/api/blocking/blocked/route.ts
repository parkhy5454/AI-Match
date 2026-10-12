/**
 * 차단된 사용자 목록 API
 * GET: 내가 차단한 사용자 목록
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { getBlockedUsers } from '@/lib/blocking-reporting-system'
import { getBlockers } from '@/lib/blocking-system'
import { logger } from '@/lib/logging'

/**
 * GET /api/blocking/blocked?type=blocked&limit=50&offset=0
 * 내가 차단한 사용자 목록 또는 나를 차단한 사용자 목록
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

    const decoded = verifyJWT(token) as any
    if (!decoded || !decoded.sub) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const userId = (decoded.sub as string)
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'blocked' // 'blocked' 또는 'blockers'
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50'),
      100
    )
    const offset = parseInt(searchParams.get('offset') || '0') || 0

    if (type === 'blocked') {
      const result = await getBlockedUsers(userId, limit, offset)

      logger.info('차단된 사용자 목록 조회 성공', {
        userId,
        count: result.blocks.length,
      })

      return NextResponse.json({
        success: true,
        data: result.blocks,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: offset + limit < result.total,
        },
      })
    } else if (type === 'blockers') {
      const result = await getBlockers(userId, limit, offset)

      logger.info('나를 차단한 사용자 목록 조회 성공', {
        userId,
        count: result.blockers.length,
      })

      return NextResponse.json({
        success: true,
        data: result.blockers,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + limit < result.total,
        },
      })
    } else {
      return NextResponse.json(
        { error: 'type은 "blocked" 또는 "blockers"여야 합니다' },
        { status: 400 }
      )
    }
  } catch (error) {
    logger.error('차단 목록 조회 API 오류', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      { error: '목록 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
