/**
 * 알림 전송 API
 * POST /api/notification/send
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendNotification, sendEmailNotification, sendPushNotification } from '@/lib/notification-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

interface SendNotificationRequest {
  userId: string
  notificationType: string
  channels?: ('email' | 'push' | 'sms')[]
  data?: Record<string, any>
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

    const currentUserId = verifyToken(token)
    if (!currentUserId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const body: SendNotificationRequest = await request.json()
    const { userId, notificationType, channels = ['email', 'push'], data = {} } = body

    // 유효성 검사
    if (!userId || !notificationType) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다' },
        { status: 400 }
      )
    }

    // 자신의 알림만 전송 가능 (관리자는 제외)
    const isAdmin = await isUserAdmin(currentUserId)
    if (!isAdmin && currentUserId !== userId) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    // 알림 전송
    await sendNotification(userId, notificationType, channels, data)

    logger.info('알림 전송 완료', {
      userId,
      notificationType,
      channels,
    })

    return NextResponse.json({
      success: true,
      message: '알림이 전송되었습니다',
    })
  } catch (error) {
    logger.error('알림 전송 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { success: false, error: '알림 전송에 실패했습니다' },
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
