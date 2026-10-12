/**
 * 신고 관리 API (관리자용)
 * GET: 대기 중인 신고 또는 특정 사용자의 신고 목록
 * PUT: 신고 상태 업데이트
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import {
  getReportsForUser,
  updateReportStatus,
  ReportStatus,
  getDashboardStats
} from '@/lib/blocking-system'
import { logger } from '@/lib/logging'
import { db } from '@/lib/db'

/**
 * GET /api/reporting/admin?action=pending|user&userId=...&limit=50&offset=0
 * 대기 중인 신고 또는 특정 사용자의 신고 목록
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

    // TODO: 관리자 권한 확인 필요
    // const isAdmin = await checkAdminStatus(decoded.sub)

    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') || 'pending'
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '50'),
      100
    )
    const offset = parseInt(searchParams.get('offset') || '0') || 0

    if (action === 'dashboard') {
      const stats = await getDashboardStats()
      return NextResponse.json({
        success: true,
        stats,
      })
    }

    if (action === 'user') {
      const userId = searchParams.get('userId')
      if (!userId) {
        return NextResponse.json(
          { error: 'userId 파라미터가 필요합니다' },
          { status: 400 }
        )
      }

      const result = await getReportsForUser(userId, limit, offset)

      return NextResponse.json({
        success: true,
        data: result.reports,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + limit < result.total,
        },
        uniqueReporters: result.uniqueReporters,
      })
    }

    // pending: 대기 중인 신고 목록
    const [reports, total] = await Promise.all([
      db.userReport.findMany({
        where: { status: ReportStatus.PENDING },
        include: {
          reporter: {
            select: { id: true, username: true },
          },
          reportedUser: {
            select: { id: true, username: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit,
      }),
      db.userReport.count({
        where: { status: ReportStatus.PENDING },
      }),
    ])

    logger.info('대기 중인 신고 목록 조회 성공', {
      count: reports.length,
    })

    return NextResponse.json({
      success: true,
      data: reports.map((r) => ({
        id: r.id,
        reporter: r.reporter,
        reportedUser: r.reportedUser,
        category: r.category,
        description: r.description,
        attachmentUrls: r.attachmentUrls
          ? r.attachmentUrls.split(',')
          : [],
        status: r.status,
        createdAt: r.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    logger.error('신고 목록 조회 API 오류 (관리자)', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      { error: '목록 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/reporting/admin/{reportId}
 * 신고 상태 업데이트
 */
export async function PUT(request: NextRequest) {
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

    // TODO: 관리자 권한 확인

    const { reportId, status, adminNotes } = await request.json()

    if (!reportId) {
      return NextResponse.json(
        { error: '신고 ID가 필요합니다' },
        { status: 400 }
      )
    }

    if (!status || !Object.values(ReportStatus).includes(status)) {
      return NextResponse.json(
        { error: '유효한 상태가 필요합니다' },
        { status: 400 }
      )
    }

    const report = await updateReportStatus(reportId, status, adminNotes)

    logger.info('신고 상태 업데이트 성공', {
      reportId,
      newStatus: status,
      adminId: decoded.sub,
    })

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        status: report.status,
        adminNotes: report.adminNotes,
        resolvedAt: report.resolvedAt,
      },
    })
  } catch (error) {
    logger.error('신고 상태 업데이트 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      { error: '상태 업데이트 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
