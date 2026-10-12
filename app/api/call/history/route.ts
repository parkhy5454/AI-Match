/**
 * 통화 기록 API
 * GET /api/call/history
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCallHistory, getCallSummaryStats } from '@/lib/video-call-system'
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

    const userId = verifyToken(token)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const withStats = searchParams.get('stats') === 'true'

    const history = await getCallHistory(userId, page, limit)

    let summaryStats = null
    if (withStats) {
      summaryStats = await getCallSummaryStats(userId)
    }

    logger.info('통화 기록 조회', {
      userId,
      page,
      limit,
      count: history.data.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        calls: history,
        summary: summaryStats,
      },
    })
  } catch (error) {
    logger.error('통화 기록 조회 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '기록 조회에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
