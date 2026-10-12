/**
 * 프로필 이미지 삭제 API
 * DELETE /api/profile/images/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { deleteProfileImage } from '@/lib/profile-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

interface RouteParams {
  params: {
    id: string
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const imageId = params.id

    await deleteProfileImage(imageId, userId)

    logger.info('프로필 이미지 삭제', {
      userId,
      imageId,
    })

    return NextResponse.json({
      success: true,
      message: '이미지가 삭제되었습니다',
    })
  } catch (error) {
    logger.error('프로필 이미지 삭제 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '이미지 삭제에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
