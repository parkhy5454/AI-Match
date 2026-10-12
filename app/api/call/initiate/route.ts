/**
 * 비디오 통화 시작 API
 * POST /api/call/initiate
 */

import { NextRequest, NextResponse } from 'next/server'
import { initiateVideoCall } from '@/lib/video-call-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

interface InitiateCallRequest {
  recipientId: string
  callType?: 'video' | 'audio'
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

    const body: InitiateCallRequest = await request.json()

    if (!body.recipientId) {
      return NextResponse.json(
        { success: false, error: '수신자 ID는 필수입니다' },
        { status: 400 }
      )
    }

    if (userId === body.recipientId) {
      return NextResponse.json(
        { success: false, error: '자신에게 통화를 걸 수 없습니다' },
        { status: 400 }
      )
    }

    const call = await initiateVideoCall(
      userId,
      body.recipientId,
      body.callType || 'video'
    )

    logger.info('통화 시작', {
      callId: call.id,
      initiatorId: userId,
      recipientId: body.recipientId,
      callType: body.callType || 'video',
    })

    return NextResponse.json({
      success: true,
      data: call,
      message: '통화를 시작했습니다',
    })
  } catch (error) {
    logger.error('통화 시작 API 오류', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '통화 시작에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
