/**
 * 메시지 읽음 처리 API
 * POST /api/message/[id]/read - 개별 메시지
 * DELETE /api/message/[id]/read - 대화 전체
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  markMessageAsRead,
  markConversationAsRead,
} from '@/lib/messaging-system'
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

    const messageId = params.id

    await markMessageAsRead(messageId, userId)

    logger.info('메시지 읽음 처리', { messageId, userId })

    return NextResponse.json({
      success: true,
      message: '메시지를 읽음으로 표시했습니다',
    })
  } catch (error) {
    logger.error('메시지 읽음 처리 API 오류', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '읽음 처리에 실패했습니다',
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

    await markConversationAsRead(conversationId, userId)

    logger.info('대화 읽음 처리', { conversationId, userId })

    return NextResponse.json({
      success: true,
      message: '모든 메시지를 읽음으로 표시했습니다',
    })
  } catch (error) {
    logger.error('대화 읽음 처리 API 오류', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '읽음 처리에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
