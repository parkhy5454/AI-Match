/**
 * 추천 사용자 API
 * GET /api/matching/recommendations - 개인화된 추천 사용자
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRecommendations } from '@/lib/matching-system'
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
    const limit = parseInt(searchParams.get('limit') || '10')

    const recommendations = await getRecommendations(userId, limit)

    logger.info('추천 사용자 조회', {
      userId,
      count: recommendations.length
    })

    return NextResponse.json({
      success: true,
      data: {
        recommendations
      }
    })
  } catch (error) {
    logger.error('추천 사용자 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '추천 조회에 실패했습니다'
      },
      { status: 500 }
    )
  }
}
