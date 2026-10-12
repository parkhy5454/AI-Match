/**
 * 결제 통계 조회 API (관리자용)
 * GET /api/payment/statistics?startDate=2026-10-01&endDate=2026-10-31
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPaymentStatistics } from '@/lib/payment-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
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

    // 관리자 권한 확인
    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    let startDate: Date | undefined
    let endDate: Date | undefined

    if (startDateStr) {
      startDate = new Date(startDateStr)
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { success: false, error: '유효하지 않은 시작 날짜입니다' },
          { status: 400 }
        )
      }
    }

    if (endDateStr) {
      endDate = new Date(endDateStr)
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { success: false, error: '유효하지 않은 종료 날짜입니다' },
          { status: 400 }
        )
      }
    }

    const statistics = await getPaymentStatistics(startDate, endDate)

    logger.info('결제 통계 조회', {
      adminUserId: userId,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      statistics,
    })

    return NextResponse.json({
      success: true,
      data: statistics,
    })
  } catch (error) {
    logger.error('결제 통계 조회 API 오류', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      { success: false, error: '결제 통계 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}
