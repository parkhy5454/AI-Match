/**
 * 대화 뮤트 API
 * POST /api/message/conversations/[id]/mute
 * DELETE /api/message/conversations/[id]/mute
 */

import { NextRequest, NextResponse } from 'next/server'
import { muteConversation } from '@/lib/messaging-system'
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

    const conversationId = params.id

    await muteConversation(conversationId, userId, true)

    logger.info('대화 뮤트 설정', { conversationId, userId })

    return NextResponse.json({
      success: true,
      message: '대화를 뮤트했습니다',
    })
  } catch (error) {
    logger.error('대화 뮤트 API 오류', {
      conversationId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '뮤트에 실패했습니다',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const conversationId = params.id

    await muteConversation(conversationId, userId, false)

    logger.info('대화 뮤트 해제', { conversationId, userId })

    return NextResponse.json({
      success: true,
      message: '대화 뮤트를 해제했습니다',
    })
  } catch (error) {
    logger.error('대화 뮤트 해제 API 오류', {
      conversationId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '해제에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
