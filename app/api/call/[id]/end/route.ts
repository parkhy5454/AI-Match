/**
 * 통화 종료 API
 * POST /api/call/[id]/end
 */

import { NextRequest, NextResponse } from 'next/server'
import { endCall } from '@/lib/video-call-system'
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
    const call = await endCall(callId, userId)

    logger.info('통화 종료', {
      callId,
      userId,
      duration: call.duration,
      status: call.status,
    })

    return NextResponse.json({
      success: true,
      data: call,
      message: '통화가 종료되었습니다',
    })
  } catch (error) {
    logger.error('통화 종료 API 오류', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '통화 종료에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
