/**
 * 사용자 신고 API
 * POST: 사용자 신고
 * GET: 내 신고 목록
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import { reportUser, getUserReports, ReportCategory } from '@/lib/blocking-system'
import { logger } from '@/lib/logging'

/**
 * POST /api/reporting/report
 * 사용자를 신고합니다
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다' },
        { status: 401 }
      )
    }

    const decoded = verifyJWT(token)
    if (!decoded || !decoded.sub) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const userId = decoded.sub
    const { reportedUserId, category, description, attachmentUrls } =
      await request.json()

    if (!reportedUserId) {
      return NextResponse.json(
        { error: '신고할 사용자 ID가 필요합니다' },
        { status: 400 }
      )
    }

    if (!category || !Object.values(ReportCategory).includes(category)) {
      return NextResponse.json(
        { error: '유효한 신고 카테고리가 필요합니다' },
        { status: 400 }
      )
    }

    const report = await reportUser(
      userId,
      reportedUserId,
      category,
      description,
      attachmentUrls
    )

    logger.info('사용자 신고 API 호출 성공', {
      reportId: report.id,
      reporterId: userId,
      reportedUserId,
      category,
    })

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        category: report.category,
        status: report.status,
        createdAt: report.createdAt,
      },
    })
  } catch (error) {
    logger.error('사용자 신고 API 오류', error instanceof Error ? error : new Error(String(error)))

    const statusCode =
      error instanceof Error && error.message.includes('자신')
        ? 400
        : error instanceof Error && error.message.includes('중복')
          ? 409
          : 500

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '신고 중 오류가 발생했습니다',
      },
      { status: statusCode }
    )
  }
}

/**
 * GET /api/reporting/report?limit=20&offset=0
 * 내가 한 신고 목록
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다' },
        { status: 401 }
      )
    }

    const decoded = verifyJWT(token)
    if (!decoded || !decoded.sub) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const userId = decoded.sub
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '20'),
      50
    )
    const offset = parseInt(searchParams.get('offset') || '0') || 0

    const result = await getUserReports(userId, limit, offset)

    logger.info('내 신고 목록 조회 성공', {
      userId,
      count: result.reports.length,
    })

    return NextResponse.json({
      success: true,
      data: result.reports.map((r) => ({
        id: r.id,
        reportedUserId: r.reportedUserId,
        category: r.category,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt,
      })),
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: offset + limit < result.total,
      },
    })
  } catch (error) {
    logger.error('신고 목록 조회 API 오류', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      { error: '목록 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
