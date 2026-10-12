/**
 * 사용자 좋아요 API
 * POST /api/interactions/like - 좋아요 추가
 * DELETE /api/interactions/like - 좋아요 취소
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logging'
import { verifyJWT } from '@/lib/auth'
import { sendPushNotification } from '@/lib/push-notification'
import { NotificationType } from '@/lib/push-notification'

export async function POST(request: NextRequest) {
  try {
    // JWT 인증
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { success: false, error: '인증 토큰이 필요합니다' },
        { status: 401 }
      )
    }

    const decoded = verifyJWT(token)
    if (!decoded?.sub) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const fromUserId = decoded.sub
    const { toUserId } = await request.json()

    // 입력 검증
    if (!toUserId) {
      return NextResponse.json(
        { success: false, error: '상대방 ID가 필요합니다' },
        { status: 400 }
      )
    }

    if (fromUserId === toUserId) {
      return NextResponse.json(
        { success: false, error: '자신에게 좋아요를 할 수 없습니다' },
        { status: 400 }
      )
    }

    // 상대방 사용자 확인
    const toUser = await db.user.findUnique({
      where: { id: toUserId },
      select: { id: true, username: true },
    })

    if (!toUser) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 이미 좋아요했는지 확인
    const existingLike = await db.like.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId,
          toUserId,
        },
      },
    })

    if (existingLike) {
      return NextResponse.json(
        { success: false, error: '이미 좋아요한 사용자입니다' },
        { status: 400 }
      )
    }

    // 좋아요 생성
    const like = await db.like.create({
      data: {
        fromUserId,
        toUserId,
      },
    })

    // 상대방도 좋아요했는지 확인 (매칭 여부)
    const reverseLike = await db.like.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: toUserId,
          toUserId: fromUserId,
        },
      },
    })

    let isMatch = false

    if (reverseLike) {
      // 매칭 생성
      const match = await db.match.create({
        data: {
          user1Id: fromUserId,
          user2Id: toUserId,
        },
      })

      isMatch = true

      // 상대방에게 매칭 알림 푸시
      const fromUser = await db.user.findUnique({
        where: { id: fromUserId },
        select: { username: true },
      })

      await sendPushNotification(toUserId, NotificationType.MATCH, {
        title: '새로운 매칭!',
        body: `${fromUser?.username}님과 매칭되었습니다!`,
        icon: 'ic_match',
        data: {
          matchId: match.id,
          userId: fromUserId,
        },
      })

      logger.info('매칭 생성', {
        user1Id: fromUserId,
        user2Id: toUserId,
        matchId: match.id,
      })
    } else {
      // 상대방에게 좋아요 알림 푸시
      const fromUser = await db.user.findUnique({
        where: { id: fromUserId },
        select: { username: true, profileImage: true },
      })

      await sendPushNotification(toUserId, NotificationType.LIKE, {
        title: '새로운 좋아요!',
        body: `${fromUser?.username}님이 당신을 좋아합니다`,
        icon: 'ic_heart',
        data: {
          userId: fromUserId,
        },
      })
    }

    logger.info('좋아요 추가', {
      fromUserId,
      toUserId,
      isMatch,
    })

    return NextResponse.json({
      success: true,
      data: {
        like: {
          id: like.id,
          fromUserId: like.fromUserId,
          toUserId: like.toUserId,
          createdAt: like.createdAt,
        },
        isMatch,
      },
      message: isMatch ? '매칭되었습니다!' : '좋아요를 했습니다',
    })
  } catch (error) {
    logger.error('좋아요 추가 실패', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: '좋아요 추가 중 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // JWT 인증
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { success: false, error: '인증 토큰이 필요합니다' },
        { status: 401 }
      )
    }

    const decoded = verifyJWT(token)
    if (!decoded?.sub) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const fromUserId = decoded.sub
    const { toUserId } = await request.json()

    if (!toUserId) {
      return NextResponse.json(
        { success: false, error: '상대방 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // 좋아요 삭제
    await db.like.delete({
      where: {
        fromUserId_toUserId: {
          fromUserId,
          toUserId,
        },
      },
    })

    logger.info('좋아요 취소', {
      fromUserId,
      toUserId,
    })

    return NextResponse.json({
      success: true,
      message: '좋아요를 취소했습니다',
    })
  } catch (error) {
    logger.error('좋아요 취소 실패', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: '좋아요 취소 중 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}
