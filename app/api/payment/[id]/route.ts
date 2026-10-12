/**
 * 결제 상세 조회 API
 * GET /api/payment/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayment, getReceiptUrl } from '@/lib/payment-system'
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

    const paymentId = params.id

    const payment = await getPayment(paymentId)

    if (!payment || payment.userId !== userId) {
      return NextResponse.json(
        { success: false, error: '결제를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 영수증 URL 조회
    const receiptUrl = await getReceiptUrl(paymentId)

    logger.info('결제 상세 조회', {
      userId,
      paymentId,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...payment,
        receiptUrl: receiptUrl || payment.receiptUrl,
      },
    })
  } catch (error) {
    logger.error('결제 상세 조회 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      { success: false, error: '결제 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}
