/**
 * 관리자 사용자 차단 API
 * POST /api/admin/users/[id]/ban - 사용자 계정 영구 차단
 */

import { NextRequest, NextResponse } from 'next/server'
import { banUser, getUserDetails } from '@/lib/admin-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'
import { db } from '@/lib/db'

interface RouteParams {
  params: {
    id: string
  }
}

interface BanRequest {
  reason: string
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

    const body: BanRequest = await request.json()
    const targetUserId = params.id

    if (!body.reason) {
      return NextResponse.json(
        { success: false, error: '차단 사유는 필수입니다' },
        { status: 400 }
      )
    }

    // 자신을 차단할 수 없음
    if (userId === targetUserId) {
      return NextResponse.json(
        { success: false, error: '자신의 계정을 차단할 수 없습니다' },
        { status: 400 }
      )
    }

    await banUser(targetUserId)

    // 감사 로그
    await db.execute(`
      INSERT INTO audit_log (
        id, adminId, action, targetUserId, details, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      `audit_${Date.now()}`,
      userId,
      'BAN_USER',
      targetUserId,
      JSON.stringify({ reason: body.reason }),
      new Date(),
    ])

    logger.info('사용자 차단', {
      adminId: userId,
      targetUserId,
      reason: body.reason,
    })

    return NextResponse.json({
      success: true,
      message: '사용자가 영구적으로 차단되었습니다',
    })
  } catch (error) {
    logger.error('사용자 차단 API 오류', {
      userId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '사용자 차단에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
