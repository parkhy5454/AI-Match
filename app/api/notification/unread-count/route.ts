/**
 * 읽지 않은 알림 개수 조회 API
 * GET /api/notification/unread-count
 */

import { NextRequest, NextResponse } from 'next/server'
import { getNotifications } from '@/lib/notification-system'
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

    // 읽지 않은 알림만 조회
    const unreadNotifications = await getNotifications(userId, 1000, 0, true)
    const unreadCount = unreadNotifications.length

    logger.info('읽지 않은 알림 개수 조회', {
      userId,
      unreadCount,
    })

    return NextResponse.json({
      success: true,
      data: {
        unreadCount,
      },
    })
  } catch (error) {
    logger.error('읽지 않은 알림 개수 조회 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      { success: false, error: '알림 개수 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}
