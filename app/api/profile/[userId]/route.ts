/**
 * 공개 프로필 조회 API
 * GET /api/profile/[userId] - 특정 사용자의 공개 프로필 조회
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPublicProfile } from '@/lib/profile-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

interface RouteParams {
  params: {
    userId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    let viewerId: string | undefined

    if (token) {
      viewerId = verifyToken(token) || undefined
    }

    const profile = await getPublicProfile(params.userId, viewerId)

    if (!profile) {
      return NextResponse.json(
        { success: false, error: '프로필을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    logger.info('공개 프로필 조회', {
      userId: params.userId,
      viewerId
    })

    return NextResponse.json({
      success: true,
      data: profile
    })
  } catch (error) {
    logger.error('공개 프로필 조회 API 오류', {
      userId: params.userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '프로필 조회에 실패했습니다'
      },
      { status: 500 }
    )
  }
}
