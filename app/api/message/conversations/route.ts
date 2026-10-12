/**
 * 대화 목록 API
 * GET /api/message/conversations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConversations } from '@/lib/messaging-system'
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const conversations = await getConversations(userId, page, limit)

    logger.info('대화 목록 조회', {
      userId,
      page,
      limit,
      count: conversations.data.length,
    })

    return NextResponse.json({
      success: true,
      data: conversations,
    })
  } catch (error) {
    logger.error('대화 목록 조회 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '대화 목록 조회에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
