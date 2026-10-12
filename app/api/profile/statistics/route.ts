/**
 * 프로필 통계 API
 * GET /api/profile/statistics?userId=user-123&days=30
 * POST /api/profile/view - 프로필 조회 기록
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getProfileStatistics,
  recordProfileView,
  calculateProfileCompleteness,
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

    const currentUserId = verifyToken(token)
    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || currentUserId
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 365)

    // 자신의 통계만 조회 가능 (관리자는 제외)
    if (userId !== currentUserId) {
      const isAdmin = await isUserAdmin(currentUserId)
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: '권한이 없습니다' },
          { status: 403 }
        )
      }
    }

    const [statistics, completeness] = await Promise.all([
      getProfileStatistics(userId, days),
      calculateProfileCompleteness(userId),
    ])

    logger.info('프로필 통계 조회', {
      currentUserId,
      userId,
      days,
    })

    return NextResponse.json({
      success: true,
      data: {
        statistics,
        completeness,
      },
    })
  } catch (error) {
    logger.error('프로필 통계 조회 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '통계 조회에 실패했습니다',
      },
      { status: 500 }
    )
  }
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

    const viewerId = verifyToken(token)
    if (!viewerId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { viewedUserId } = body

    if (!viewedUserId) {
      return NextResponse.json(
        { success: false, error: '조회된 사용자 ID가 필요합니다' },
        { status: 400 }
      )
    }

    if (viewerId === viewedUserId) {
      return NextResponse.json(
        { success: false, error: '자신의 프로필은 조회할 수 없습니다' },
        { status: 400 }
      )
    }

    await recordProfileView(viewerId, viewedUserId)

    logger.info('프로필 조회 기록', {
      viewerId,
      viewedUserId,
    })

    return NextResponse.json({
      success: true,
      message: '프로필 조회가 기록되었습니다',
    })
  } catch (error) {
    logger.error('프로필 조회 기록 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '조회 기록에 실패했습니다',
      },
      { status: 500 }
    )
  }
}

async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const { db } = await import('@/lib/db')
    const user = await db.user.findUnique({
      where: { id: userId },
    })
    return user?.role === 'admin'
  } catch {
    return false
  }
}
