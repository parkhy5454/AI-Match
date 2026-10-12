/**
 * 관리자 사용자 정지 API
 * POST /api/admin/users/[id]/suspend - 사용자 계정 정지
 * DELETE /api/admin/users/[id]/suspend - 사용자 정지 해제
 */

import { NextRequest, NextResponse } from 'next/server'
import { suspendUser, getUserDetails } from '@/lib/admin-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'
import { db } from '@/lib/db'

interface RouteParams {
  params: {
    id: string
  }
}

interface SuspendRequest {
  reason: string
  durationHours?: number
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }
    const userId = payload.userId
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    // 관리자 권한 확인
    const adminUser = await getUserDetails(userId)
    if (adminUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const body: SuspendRequest = await request.json()
    const targetUserId = params.id
    const durationHours = body.durationHours || 24

    if (!body.reason) {
      return NextResponse.json(
        { success: false, error: '정지 사유는 필수입니다' },
        { status: 400 }
      )
    }

    await suspendUser(targetUserId, durationHours)

    // 감사 로그
    await db.execute(`
      INSERT INTO audit_log (
        id, adminId, action, targetUserId, details, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      `audit_${Date.now()}`,
      userId,
      'SUSPEND_USER',
      targetUserId,
      JSON.stringify({ reason: body.reason, durationHours }),
      new Date(),
    ])

    logger.info('사용자 정지', {
      adminId: userId,
      targetUserId,
      durationHours,
      reason: body.reason,
    })

    return NextResponse.json({
      success: true,
      message: `사용자가 ${durationHours}시간 동안 정지되었습니다`,
    })
  } catch (error) {
    logger.error('사용자 정지 API 오류', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '사용자 정지에 실패했습니다',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }
    const userId = payload.userId
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    // 관리자 권한 확인
    const adminUser = await getUserDetails(userId)
    if (adminUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const targetUserId = params.id

    // 정지 해제
    await db.execute(`
      UPDATE user SET status = ? WHERE id = ?
    `, ['active', targetUserId])

    // 감사 로그
    await db.execute(`
      INSERT INTO audit_log (
        id, adminId, action, targetUserId, details, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      `audit_${Date.now()}`,
      userId,
      'UNSUSPEND_USER',
      targetUserId,
      JSON.stringify({}),
      new Date(),
    ])

    logger.info('사용자 정지 해제', {
      adminId: userId,
      targetUserId,
    })

    return NextResponse.json({
      success: true,
      message: '사용자 정지가 해제되었습니다',
    })
  } catch (error) {
    logger.error('사용자 정지 해제 API 오류', {
      userId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '사용자 정지 해제에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
