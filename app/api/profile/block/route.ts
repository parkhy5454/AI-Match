/**
 * 프로필 차단 관리 API
 * POST /api/profile/block - 프로필 차단
 * GET /api/profile/block - 차단 목록 조회
 */

import { NextRequest, NextResponse } from 'next/server'
import { blockProfile, getBlockedProfiles } from '@/lib/profile-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

interface BlockRequest {
  blockedUserId: string
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

    const body: BlockRequest = await request.json()
    const { blockedUserId } = body

    if (!blockedUserId) {
      return NextResponse.json(
        { success: false, error: '차단할 사용자 ID가 필요합니다' },
        { status: 400 }
      )
    }

    await blockProfile(userId, blockedUserId)

    logger.info('프로필 차단', {
      userId,
      blockedUserId,
    })

    return NextResponse.json({
      success: true,
      message: '프로필이 차단되었습니다',
    })
  } catch (error) {
    logger.error('프로필 차단 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '차단에 실패했습니다',
      },
      { status: 500 }
    )
  }
}

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

    const blockedProfiles = await getBlockedProfiles(userId)

    logger.info('차단된 프로필 목록 조회', {
      userId,
      count: blockedProfiles.length,
    })

    return NextResponse.json({
      success: true,
      data: blockedProfiles,
    })
  } catch (error) {
    logger.error('차단된 프로필 목록 조회 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '목록 조회에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
