/**
 * Push Notification Device Token Management API
 * POST /api/push-notifications/subscribe - 디바이스 토큰 등록
 * DELETE /api/push-notifications/subscribe - 디바이스 토큰 삭제
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logging'
import { verifyAuth } from '@/lib/auth'

/**
 * 디바이스 토큰 등록
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { token, deviceInfo } = body

    // 입력 검증
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'token은 필수입니다' },
        { status: 400 }
      )
    }

    if (token.length < 10) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 400 }
      )
    }

    // 중복 확인
    const existingToken = await db.pushToken.findFirst({
      where: {
        token,
        userId: user.id,
      },
    })

    if (existingToken) {
      // 이미 존재하는 토큰이면 업데이트
      const updated = await db.pushToken.update({
        where: { id: existingToken.id },
        data: {
          isActive: true,
          lastUsedAt: new Date(),
          deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
        },
      })

      logger.info('푸시 토큰 업데이트됨', {
        userId: user.id,
        tokenId: updated.id,
        deviceInfo,
      })

      return NextResponse.json({
        success: true,
        data: {
          tokenId: updated.id,
          message: '디바이스 토큰이 업데이트되었습니다',
        },
      })
    }

    // 새 토큰 등록
    const pushToken = await db.pushToken.create({
      data: {
        userId: user.id,
        token,
        isActive: true,
        deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
      },
    })

    logger.info('푸시 토큰 등록됨', {
      userId: user.id,
      tokenId: pushToken.id,
      deviceInfo,
    })

    return NextResponse.json({
      success: true,
      data: {
        tokenId: pushToken.id,
        message: '디바이스 토큰이 등록되었습니다',
      },
    })
  } catch (error) {
    logger.error('푸시 토큰 등록 실패', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      {
        success: false,
        error: '푸시 토큰 등록 중 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}

/**
 * 디바이스 토큰 삭제 (로그아웃 시)
 */
export async function DELETE(request: NextRequest) {
  try {
    // 인증 확인
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { token } = body

    // 입력 검증
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'token은 필수입니다' },
        { status: 400 }
      )
    }

    // 토큰 삭제
    await db.pushToken.deleteMany({
      where: {
        token,
        userId: user.id,
      },
    })

    logger.info('푸시 토큰 삭제됨', {
      userId: user.id,
      token: token.substring(0, 20) + '...',
    })

    return NextResponse.json({
      success: true,
      message: '디바이스 토큰이 삭제되었습니다',
    })
  } catch (error) {
    logger.error('푸시 토큰 삭제 실패', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      {
        success: false,
        error: '푸시 토큰 삭제 중 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}
