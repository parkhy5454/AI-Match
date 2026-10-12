/**
 * 메시지 삭제 API
 * DELETE /api/message/[id]/delete
 */

import { NextRequest, NextResponse } from 'next/server'
import { deleteMessage } from '@/lib/messaging-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

interface RouteParams {
  params: {
    id: string
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

    const messageId = params.id

    await deleteMessage(messageId, userId)

    logger.info('메시지 삭제', { messageId, userId })

    return NextResponse.json({
      success: true,
      message: '메시지가 삭제되었습니다',
    })
  } catch (error) {
    logger.error('메시지 삭제 API 오류', {
      messageId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '삭제에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
