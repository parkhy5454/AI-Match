/**
 * 관심사 업데이트 API
 * POST /api/profile/interests
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateUserInterests } from '@/lib/profile-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

interface UpdateInterestsRequest {
  interests: string[]
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

    const body: UpdateInterestsRequest = await request.json()
    const { interests } = body

    if (!interests || !Array.isArray(interests)) {
      return NextResponse.json(
        { success: false, error: '관심사 목록이 필요합니다' },
        { status: 400 }
      )
    }

    await updateUserInterests(userId, interests)

    logger.info('관심사 업데이트', {
      userId,
      interestCount: interests.length,
    })

    return NextResponse.json({
      success: true,
      message: '관심사가 업데이트되었습니다',
      data: {
        interestCount: interests.length,
        interests,
      },
    })
  } catch (error) {
    logger.error('관심사 업데이트 API 오류', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '관심사 업데이트에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
