/**
 * 사용자 차단 API
 * POST: 사용자 차단
 * DELETE: 사용자 차단 해제
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { blockUser, unblockUser } from '@/lib/blocking-reporting-system'
import { logger } from '@/lib/logging'

/**
 * POST /api/blocking/block
 * 사용자를 차단합니다
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다' },
        { status: 401 }
      )
    }

    const decoded = verifyJWT(token)
    if (!decoded || !decoded.sub) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const userId = decoded.sub
    const { blockedUserId, reason } = await request.json()

    if (!blockedUserId) {
      return NextResponse.json(
        { error: '차단할 사용자 ID가 필요합니다' },
        { status: 400 }
      )
    }

    if (userId === blockedUserId) {
      return NextResponse.json(
        { error: '자기 자신을 차단할 수 없습니다' },
        { status: 400 }
      )
    }

    const block = await blockUser(userId, blockedUserId, reason)

    logger.info('사용자 차단 API 호출 성공', {
      userId,
      blockedUserId,
    })

    return NextResponse.json({
      success: true,
      block: {
        blockedUserId: block.blockedUserId,
        reason: block.reason,
        createdAt: block.createdAt,
      },
    })
  } catch (error) {
    logger.error('사용자 차단 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '차단 중 오류가 발생했습니다',
      },
      { status: error instanceof Error && error.message.includes('자신') ? 400 : 500 }
    )
  }
}

/**
 * DELETE /api/blocking/block
 * 사용자 차단을 해제합니다
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다' },
        { status: 401 }
      )
    }

    const decoded = verifyJWT(token)
    if (!decoded || !decoded.sub) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const userId = decoded.sub
    const { blockedUserId } = await request.json()

    if (!blockedUserId) {
      return NextResponse.json(
        { error: '차단 해제할 사용자 ID가 필요합니다' },
        { status: 400 }
      )
    }

    const success = await unblockUser(userId, blockedUserId)

    if (!success) {
      return NextResponse.json(
        { error: '차단을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    logger.info('사용자 차단 해제 API 호출 성공', {
      userId,
      blockedUserId,
    })

    return NextResponse.json({
      success: true,
      message: '차단이 해제되었습니다',
    })
  } catch (error) {
    logger.error('사용자 차단 해제 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { error: '차단 해제 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
