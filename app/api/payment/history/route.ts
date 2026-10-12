/**
 * 결제 내역 조회 API
 * GET /api/payment/history?limit=10&offset=0
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPaymentHistory } from '@/lib/payment-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]

    if (!token) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const userId = verifyToken(token)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await getPaymentHistory(userId, limit, offset)

    logger.info('결제 내역 조회', {
      userId,
      count: result.payments.length,
      total: result.total,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('결제 내역 조회 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { success: false, error: '결제 내역 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}
