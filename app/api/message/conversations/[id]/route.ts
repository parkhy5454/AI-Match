/**
 * 대화 메시지 조회 API
 * GET /api/message/conversations/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMessages, getConversationStats } from '@/lib/messaging-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const withStats = searchParams.get('stats') === 'true'

    const conversationId = params.id

    const [messages, stats] = await Promise.all([
      getMessages(conversationId, userId, page, limit),
      withStats ? getConversationStats(conversationId, userId) : null,
    ])

    logger.info('대화 메시지 조회', {
      userId,
      conversationId,
      page,
      limit,
      messageCount: messages.data.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        messages,
        stats,
      },
    })
  } catch (error) {
    logger.error('대화 메시지 조회 API 오류', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '메시지 조회에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
