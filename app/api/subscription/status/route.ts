/**
 * GET /api/subscription/status
 * 구독 상태 조회 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/jwt'
import { getUserSubscription, getUserPlanType } from '@/lib/subscription-system'

export async function GET(request: NextRequest) {
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

    // 구독 정보 조회
    const subscription = await getUserSubscription(userId)
    const planType = await getUserPlanType(userId)

    if (!subscription && planType === 'free') {
      return NextResponse.json(
        {
          data: {
            planType: 'free',
            status: 'none',
            subscription: null,
          },
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        data: {
          planType,
          status: subscription?.status || 'expired',
          subscription: subscription
            ? {
                id: subscription.id,
                planType: subscription.planType,
                status: subscription.status,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                autoRenew: subscription.autoRenew,
              }
            : null,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '구독 상태 조회 중 오류 발생' },
      { status: 500 }
    )
  }
}
