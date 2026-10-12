/**
 * GET /api/calling/history
 * 통화 이력 조회 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/jwt'
import {
  getCallHistory,
  getCallStatistics,
  getActiveCall,
  getPendingCall,
} from '@/lib/calling-system'

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

    // 쿼리 파라미터 처리
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') || 'history'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const callType = searchParams.get('callType') as 'voice' | 'video' | null
    const status = searchParams.get('status')

    switch (action) {
      case 'history': {
        // 통화 이력 조회
        const result = await getCallHistory(userId, {
          callType: callType || undefined,
          status: status as any,
          limit,
          offset,
        })

        return NextResponse.json(
          {
            data: {
              calls: result.calls,
              pagination: {
                total: result.total,
                limit: result.limit,
                offset: result.offset,
                hasMore: result.hasMore,
              },
            },
          },
          { status: 200 }
        )
      }

      case 'statistics': {
        // 통화 통계 조회
        const stats = await getCallStatistics(userId)

        return NextResponse.json(
          {
            data: {
              totalCalls: stats.totalCalls,
              totalDuration: stats.totalDuration,
              averageDuration: stats.averageDuration,
              missedCalls: stats.missedCalls,
              declinedCalls: stats.declinedCalls,
              lastCallDate: stats.lastCallDate,
            },
          },
          { status: 200 }
        )
      }

      case 'active': {
        // 진행 중인 통화 확인
        const activeCall = await getActiveCall(userId)

        return NextResponse.json(
          {
            data: {
              activeCall,
            },
          },
          { status: 200 }
        )
      }

      case 'pending': {
        // 대기 중인 통화 확인
        const pendingCall = await getPendingCall(userId)

        return NextResponse.json(
          {
            data: {
              pendingCall,
            },
          },
          { status: 200 }
        )
      }

      default:
        return NextResponse.json(
          { error: '유효한 action이 필요합니다' },
          { status: 400 }
        )
    }
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '통화 조회 중 오류 발생' },
      { status: 500 }
    )
  }
}
