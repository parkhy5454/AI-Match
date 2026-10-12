/**
 * 메시지 전송 API
 * POST /api/message/send
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendMessage } from '@/lib/messaging-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

interface SendMessageRequest {
  recipientId: string
  content: string
  type?: 'text' | 'image' | 'file' | 'call' | 'system'
}

export async function POST(request: NextRequest) {
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

    const body: SendMessageRequest = await request.json()

    if (!body.recipientId || !body.content) {
      return NextResponse.json(
        { success: false, error: '수신자와 메시지 내용은 필수입니다' },
        { status: 400 }
      )
    }

    if (body.content.length > 5000) {
      return NextResponse.json(
        { success: false, error: '메시지는 5000자 이하여야 합니다' },
        { status: 400 }
      )
    }

    const message = await sendMessage(
      userId,
      body.recipientId,
      body.content,
      body.type || 'text'
    )

    logger.info('메시지 전송', {
      senderId: userId,
      recipientId: body.recipientId,
      messageType: body.type || 'text',
    })

    return NextResponse.json({
      success: true,
      data: message,
      message: '메시지가 전송되었습니다',
    })
  } catch (error) {
    logger.error('메시지 전송 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '메시지 전송에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
