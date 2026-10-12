/**
 * 프로필 공개 설정 API
 * PUT /api/profile/visibility - 프로필 공개/비공개 설정 변경
 */

import { NextRequest, NextResponse } from 'next/server'
import { toggleProfileVisibility } from '@/lib/profile-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

export async function PUT(request: NextRequest) {
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

    const body = await request.json()

    if (typeof body.isPublic !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isPublic 필드가 필요합니다 (boolean)' },
        { status: 400 }
      )
    }

    const profile = await toggleProfileVisibility(userId, body.isPublic)

    logger.info('프로필 공개 설정 변경', {
      userId,
      isPublic: body.isPublic
    })

    return NextResponse.json({
      success: true,
      data: profile,
      message: `프로필이 ${body.isPublic ? '공개' : '비공개'}로 설정되었습니다`
    })
  } catch (error) {
    logger.error('프로필 공개 설정 변경 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '설정 변경에 실패했습니다'
      },
      { status: 500 }
    )
  }
}
