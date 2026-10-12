/**
 * 프로필 조회 기록 API
 * GET /api/profile/views - 사용자 프로필을 본 사람 목록
 */

import { NextRequest, NextResponse } from 'next/server'
import { getProfileViews } from '@/lib/profile-system'
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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const views = await getProfileViews(userId, limit, offset)

    logger.info('프로필 조회 기록 조회', {
      userId,
      count: views.length
    })

    return NextResponse.json({
      success: true,
      data: {
        views,
        pagination: {
          limit,
          offset,
          count: views.length
        }
      }
    })
  } catch (error) {
    logger.error('프로필 조회 기록 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '조회 기록 조회에 실패했습니다'
      },
      { status: 500 }
    )
  }
}
