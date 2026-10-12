/**
 * POST /api/subscription/cancel
 * 구독 취소 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/jwt'
import { cancelSubscription } from '@/lib/subscription-system'

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

    // 구독 취소
    const success = await cancelSubscription(userId)

    if (!success) {
      return NextResponse.json(
        { error: '취소할 활성 구독이 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        data: {
          message: '구독이 취소되었습니다',
          status: 'cancelled',
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
      { error: '구독 취소 중 오류 발생' },
      { status: 500 }
    )
  }
}
