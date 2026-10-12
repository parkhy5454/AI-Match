/**
 * 환불 처리 API
 * POST /api/payment/refund
 */

import { NextRequest, NextResponse } from 'next/server'
import { refundPayment } from '@/lib/payment-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'
import { db } from '@/lib/db'

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
    const { paymentId, reason } = body

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: '결제 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // 결제 소유자 확인
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    })

    if (!payment || payment.userId !== userId) {
      return NextResponse.json(
        { success: false, error: '결제를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (payment.status === 'refunded') {
      return NextResponse.json(
        { success: false, error: '이미 환불된 결제입니다' },
        { status: 400 }
      )
    }

    if (payment.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: '완료된 결제만 환불할 수 있습니다' },
        { status: 400 }
      )
    }

    const result = await refundPayment(paymentId, reason || 'requested_by_customer')

    logger.info('환불 요청', {
      userId,
      paymentId,
      refundId: result.refundId,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('환불 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { success: false, error: '환불 처리에 실패했습니다' },
      { status: 500 }
    )
  }
}
