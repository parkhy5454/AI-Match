/**
 * 프로필 완성도 API
 * GET /api/profile/completeness
 */

import { NextRequest, NextResponse } from 'next/server'
import { calculateProfileCompleteness } from '@/lib/profile-system'
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

    const completeness = await calculateProfileCompleteness(userId)

    logger.info('프로필 완성도 조회', {
      userId,
      completeness: completeness.completeness,
    })

    return NextResponse.json({
      success: true,
      data: completeness,
      message:
        completeness.completeness < 100
          ? `프로필 완성도를 높이려면 ${completeness.missingFields.join(', ')}을(를) 추가해주세요`
          : '프로필이 완성되었습니다',
    })
  } catch (error) {
    logger.error('프로필 완성도 조회 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '완성도 조회에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
