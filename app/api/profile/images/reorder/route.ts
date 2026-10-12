/**
 * 프로필 이미지 순서 변경 API
 * POST /api/profile/images/reorder
 */

import { NextRequest, NextResponse } from 'next/server'
import { reorderProfileImages } from '@/lib/profile-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

interface ReorderRequest {
  imageIds: string[]
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

    const userId = verifyToken(token)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const body: ReorderRequest = await request.json()
    const { imageIds } = body

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '이미지 ID 목록이 필요합니다' },
        { status: 400 }
      )
    }

    await reorderProfileImages(userId, imageIds)

    logger.info('프로필 이미지 순서 변경', {
      userId,
      count: imageIds.length,
    })

    return NextResponse.json({
      success: true,
      message: '이미지 순서가 변경되었습니다',
    })
  } catch (error) {
    logger.error('프로필 이미지 순서 변경 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '순서 변경에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
