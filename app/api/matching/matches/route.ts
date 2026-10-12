/**
 * 매칭 목록 API
 * GET /api/matching/matches - 매칭된 사용자 목록
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMatches, getMatchingStats } from '@/lib/matching-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]

    if (!token) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token) as any
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = payload.userId
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const stats = searchParams.get('stats') === 'true'
    const offset = (page - 1) * limit

    const matches = await getMatches(userId, undefined, limit, offset)

    let matchingStats = null
    if (stats) {
      matchingStats = await getMatchingStats(userId)
    }

    logger.info('매칭 목록 조회', {
      userId,
      count: matches.length
    })

    return NextResponse.json({
      success: true,
      data: {
        matches,
        stats: matchingStats,
        pagination: { page, limit, count: matches.length }
      }
    })
  } catch (error) {
    logger.error('매칭 목록 조회 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '매칭 목록 조회에 실패했습니다'
      },
      { status: 500 }
    )
  }
}
