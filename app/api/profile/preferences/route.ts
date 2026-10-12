/**
 * 프로필 선호도 API
 * GET /api/profile/preferences - 프로필 선호도 조회
 * PUT /api/profile/preferences - 프로필 선호도 업데이트
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getOrCreatePreferences,
  updatePreferences,
  toggleProfileVisibility
} from '@/lib/profile-system'
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

    const preferences = await getOrCreatePreferences(userId)

    logger.info('프로필 선호도 조회', { userId })

    return NextResponse.json({
      success: true,
      data: preferences
    })
  } catch (error) {
    logger.error('프로필 선호도 조회 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '선호도 조회에 실패했습니다'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()

    const preferences = await updatePreferences(userId, body)

    logger.info('프로필 선호도 업데이트', {
      userId,
      fields: Object.keys(body)
    })

    return NextResponse.json({
      success: true,
      data: preferences,
      message: '프로필 선호도가 업데이트되었습니다'
    })
  } catch (error) {
    logger.error('프로필 선호도 업데이트 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '선호도 업데이트에 실패했습니다'
      },
      { status: 500 }
    )
  }
}
