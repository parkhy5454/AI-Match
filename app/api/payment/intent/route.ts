/**
 * 결제 의도 생성 API
 * POST /api/payment/intent
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPaymentIntent } from '@/lib/payment-system'
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
    const { amount, reason, description, metadata } = body

    // 입력 검증
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: '유효한 금액을 입력하세요' },
        { status: 400 }
      )
    }

    if (!reason || !['subscription', 'upgrade', 'topup', 'gift', 'other'].includes(reason)) {
      return NextResponse.json(
        { success: false, error: '유효한 이유를 선택하세요' },
        { status: 400 }
      )
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '설명을 입력하세요' },
        { status: 400 }
      )
    }

    // 최대 금액 검증 (100만원)
    if (amount > 1000000) {
      return NextResponse.json(
        { success: false, error: '최대 결제 금액을 초과했습니다' },
        { status: 400 }
      )
    }

    const result = await createPaymentIntent(
      userId,
      amount,
      reason,
      description,
      metadata
    )

    logger.info('결제 의도 생성 요청', {
      userId,
      amount,
      reason,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('결제 의도 생성 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { success: false, error: '결제 의도 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
