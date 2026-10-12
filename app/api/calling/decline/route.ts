/**
 * POST /api/calling/decline
 * 통화 거절 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/jwt'
import { declineCall } from '@/lib/calling-system'

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
    const { callId } = body

    // 입력값 검증
    if (!callId) {
      return NextResponse.json(
        { error: '통화 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // 통화 거절
    await declineCall(callId, userId)

    return NextResponse.json(
      {
        data: {
          callId,
          status: 'declined',
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
      { error: '통화 거절 중 오류 발생' },
      { status: 500 }
    )
  }
}
