/**
 * 통화 응답 API
 * POST /api/call/[id]/respond
 */

import { NextRequest, NextResponse } from 'next/server'
import { respondToCall } from '@/lib/video-call-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

interface RespondToCallRequest {
  accepted: boolean
}

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body: RespondToCallRequest = await request.json()
    const callId = params.id

    const call = await respondToCall(callId, userId, body.accepted)

    const message = body.accepted ? '통화를 수락했습니다' : '통화를 거절했습니다'

    logger.info('통화 응답', {
      callId,
      userId,
      accepted: body.accepted,
    })

    return NextResponse.json({
      success: true,
      data: call,
      message,
    })
  } catch (error) {
    logger.error('통화 응답 API 오류', {
      callId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '통화 응답에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
