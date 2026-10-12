/**
 * 매칭 API
 * POST /api/matching/like - 좋아요 남기기
 * DELETE /api/matching/like - 좋아요 취소
 */

import { NextRequest, NextResponse } from 'next/server'
import { likeUser, unlikeUser } from '@/lib/matching-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

interface LikeRequest {
  likedId: string
}

export async function POST(request: NextRequest) {
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

    const body: LikeRequest = await request.json()

    if (!body.likedId) {
      return NextResponse.json(
        { success: false, error: '대상 사용자 ID가 필요합니다' },
        { status: 400 }
      )
    }

    const like = await likeUser(userId, body.likedId)

    logger.info('좋아요 남김', {
      userId,
      likedId: body.likedId,
      compatibility: like.compatibility
    })

    return NextResponse.json({
      success: true,
      data: like,
      message: '좋아요가 남겨졌습니다'
    })
  } catch (error) {
    logger.error('좋아요 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '좋아요에 실패했습니다'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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
    const likedId = searchParams.get('likedId')

    if (!likedId) {
      return NextResponse.json(
        { success: false, error: '대상 사용자 ID가 필요합니다' },
        { status: 400 }
      )
    }

    await unlikeUser(userId, likedId)

    logger.info('좋아요 취소', { userId, likedId })

    return NextResponse.json({
      success: true,
      message: '좋아요가 취소되었습니다'
    })
  } catch (error) {
    logger.error('좋아요 취소 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '좋아요 취소에 실패했습니다'
      },
      { status: 500 }
    )
  }
}
