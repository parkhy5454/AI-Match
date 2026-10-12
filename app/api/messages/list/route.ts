/**
 * 메시지 이력 조회 API
 * GET /api/messages/list?recipientId=xxx&limit=50&offset=0
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logging'
import { verifyJWT } from '@/lib/auth'

interface QueryParams {
  recipientId?: string
  limit?: string
  offset?: string
}

export async function GET(request: NextRequest) {
  try {
    // JWT 인증
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { success: false, error: '인증 토큰이 필요합니다' },
        { status: 401 }
      )
    }

    const decoded = verifyJWT(token)
    if (!decoded?.sub) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const userId = decoded.sub

    // 쿼리 파라미터 추출
    const searchParams = request.nextUrl.searchParams
    const recipientId = searchParams.get('recipientId') as string
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 입력 검증
    if (!recipientId) {
      return NextResponse.json(
        { success: false, error: '상대방 ID가 필요합니다' },
        { status: 400 }
      )
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: '제한은 1~100 사이여야 합니다' },
        { status: 400 }
      )
    }

    // 메시지 조회
    const messages = await db.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId },
          { senderId: recipientId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    // 전체 메시지 수 조회
    const total = await db.message.count({
      where: {
        OR: [
          { senderId: userId, recipientId },
          { senderId: recipientId, recipientId: userId },
        ],
      },
    })

    logger.info('메시지 이력 조회', {
      userId,
      recipientId,
      count: messages.length,
      total,
    })

    return NextResponse.json({
      success: true,
      data: {
        messages: messages.reverse(),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
      message: '메시지 조회 성공',
    })
  } catch (error) {
    logger.error('메시지 이력 조회 실패', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: '메시지 조회 중 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}
