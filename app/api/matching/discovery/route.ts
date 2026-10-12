/**
 * 디스커버리 피드 API
 * GET /api/matching/discovery - 추천 사용자 피드
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDiscoveryFeed } from '@/lib/matching-system'
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
    const minAge = searchParams.get('minAge')
    const maxAge = searchParams.get('maxAge')
    const gender = searchParams.get('gender')
    const maxDistance = searchParams.get('maxDistance')
    const interests = searchParams.get('interests')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const cards = await getDiscoveryFeed(
      userId,
      {
        minAge: minAge ? parseInt(minAge) : undefined,
        maxAge: maxAge ? parseInt(maxAge) : undefined,
        gender: gender || undefined,
        maxDistance: maxDistance ? parseInt(maxDistance) : undefined,
        interests: interests ? interests.split(',') : undefined
      },
      limit,
      offset
    )

    logger.info('디스커버리 피드 조회', {
      userId,
      cardCount: cards.length
    })

    return NextResponse.json({
      success: true,
      data: {
        cards,
        pagination: { page, limit, count: cards.length }
      }
    })
  } catch (error) {
    logger.error('디스커버리 피드 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '피드 조회에 실패했습니다'
      },
      { status: 500 }
    )
  }
}
