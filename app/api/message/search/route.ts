/**
 * 메시지 검색 API
 * GET /api/message/search
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchMessages } from '@/lib/messaging-system'
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
    const conversationId = searchParams.get('conversationId')
    const query = searchParams.get('q')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!conversationId || !query) {
      return NextResponse.json(
        { success: false, error: '대화 ID와 검색어는 필수입니다' },
        { status: 400 }
      )
    }

    const results = await searchMessages(
      conversationId,
      userId,
      query,
      page,
      limit
    )

    logger.info('메시지 검색', {
      userId,
      conversationId,
      query,
      resultCount: results.data.length,
    })

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    logger.error('메시지 검색 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '검색에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
