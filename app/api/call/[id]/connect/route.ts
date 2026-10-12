/**
 * 통화 연결 API
 * POST /api/call/[id]/connect
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectCall } from '@/lib/video-call-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

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

    const callId = params.id
    const session = await connectCall(callId, userId)

    logger.info('통화 연결', {
      callId,
      userId,
      sessionId: session.id,
    })

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        sessionToken: session.sessionToken,
        iceServers: session.iceServers,
        callId: session.callId,
      },
      message: '통화가 연결되었습니다',
    })
  } catch (error) {
    logger.error('통화 연결 API 오류', {
      callId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '통화 연결에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
