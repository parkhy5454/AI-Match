/**
 * GET /api/subscription/plans
 * 구독 플랜 조회 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSubscriptionPlans } from '@/lib/subscription-system'

export async function GET(request: NextRequest) {
  try {
    const plans = await getSubscriptionPlans()

    return NextResponse.json(
      {
        data: {
          plans: plans.map((plan) => ({
            id: plan.id,
            type: plan.type,
            name: plan.name,
            price: plan.price,
            duration: plan.duration,
            features: plan.features,
            monthlyLikes: plan.monthlyLikes,
            dailyMessages: plan.dailyMessages,
            searchFilters: plan.searchFilters,
            profileViews: plan.profileViews,
            priorityMatching: plan.priorityMatching,
            adsFree: plan.adsFree,
            profileBoost: plan.profileBoost,
            rewindCount: plan.rewindCount,
          })),
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
      { error: '플랜 조회 중 오류 발생' },
      { status: 500 }
    )
  }
}
