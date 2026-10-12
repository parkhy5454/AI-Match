/**
 * 결제 확인 API
 * POST /api/payment/confirm
 */

import { NextRequest, NextResponse } from 'next/server'
import { confirmPayment } from '@/lib/payment-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

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

    const body = await request.json()
    const { paymentIntentId } = body

    if (!paymentIntentId) {
      return NextResponse.json(
        { success: false, error: '결제 의도 ID가 필요합니다' },
        { status: 400 }
      )
    }

    const result = await confirmPayment(userId, paymentIntentId)

    logger.info('결제 확인 요청', {
      userId,
      paymentIntentId,
      status: result.status,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('결제 확인 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      { success: false, error: '결제 확인에 실패했습니다' },
      { status: 500 }
    )
  }
}
