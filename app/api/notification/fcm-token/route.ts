/**
 * FCM 토큰 관리 API
 * POST /api/notification/fcm-token - FCM 토큰 저장
 * DELETE /api/notification/fcm-token - FCM 토큰 삭제
 */

import { NextRequest, NextResponse } from 'next/server'
import { saveFcmToken, removeFcmToken } from '@/lib/notification-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

interface FcmTokenRequest {
  token: string
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

    const body: FcmTokenRequest = await request.json()
    const { token: fcmToken } = body

    if (!fcmToken || typeof fcmToken !== 'string') {
      return NextResponse.json(
        { success: false, error: 'FCM 토큰이 필요합니다' },
        { status: 400 }
      )
    }

    await saveFcmToken(userId, fcmToken)

    logger.info('FCM 토큰 저장', {
      userId,
      tokenLength: fcmToken.length,
    })

    return NextResponse.json({
      success: true,
      message: 'FCM 토큰이 저장되었습니다',
    })
  } catch (error) {
    logger.error('FCM 토큰 저장 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { success: false, error: 'FCM 토큰 저장에 실패했습니다' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    const body: FcmTokenRequest = await request.json()
    const { token: fcmToken } = body

    if (!fcmToken || typeof fcmToken !== 'string') {
      return NextResponse.json(
        { success: false, error: 'FCM 토큰이 필요합니다' },
        { status: 400 }
      )
    }

    await removeFcmToken(userId, fcmToken)

    logger.info('FCM 토큰 삭제', {
      userId,
      tokenLength: fcmToken.length,
    })

    return NextResponse.json({
      success: true,
      message: 'FCM 토큰이 삭제되었습니다',
    })
  } catch (error) {
    logger.error('FCM 토큰 삭제 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { success: false, error: 'FCM 토큰 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
