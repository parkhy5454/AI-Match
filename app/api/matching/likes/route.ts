/**
 * 좋아요 목록 API
 * GET /api/matching/likes - 내가 남긴 좋아요 목록
 * GET /api/matching/likes?received=true - 받은 좋아요 목록
 */

import { NextRequest, NextResponse } from 'next/server'
import { getLikes, getReceivedLikes } from '@/lib/matching-system'
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
    const received = searchParams.get('received') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const likes = received
      ? await getReceivedLikes(userId, limit, offset)
      : await getLikes(userId, limit, offset)

    logger.info('좋아요 목록 조회', {
      userId,
      type: received ? 'received' : 'sent',
      count: likes.length
    })

    return NextResponse.json({
      success: true,
      data: {
        likes,
        pagination: { page, limit, count: likes.length }
      }
    })
  } catch (error) {
    logger.error('좋아요 목록 조회 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '좋아요 목록 조회에 실패했습니다'
      },
      { status: 500 }
    )
  }
}
