/**
 * POST /api/subscription/subscribe
 * 구독 시작 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/jwt'
import { createSubscription, PlanType } from '@/lib/subscription-system'

export async function POST(request: NextRequest) {
  try {
    // JWT 인증
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    const userId = payload.id

    const body = await request.json()
    const { planType, paymentTransactionId } = body

    // 입력값 검증
    if (!planType) {
      return NextResponse.json(
        { error: '플랜 타입이 필요합니다' },
        { status: 400 }
      )
    }

    const validPlans: PlanType[] = ['basic', 'plus', 'premium', 'vip']
    if (!validPlans.includes(planType)) {
      return NextResponse.json(
        { error: '유효한 플랜을 선택해주세요' },
        { status: 400 }
      )
    }

    // 구독 생성
    const result = await createSubscription(
      userId,
      planType,
      paymentTransactionId || `txn_${Date.now()}`
    )

    return NextResponse.json(
      {
        data: {
          subscriptionId: result.subscriptionId,
          planType: result.planType,
          startDate: result.startDate,
          endDate: result.endDate,
          status: result.status,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '구독 생성 중 오류 발생' },
      { status: 500 }
    )
  }
}
