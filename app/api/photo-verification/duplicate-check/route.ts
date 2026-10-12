/**
 * Duplicate Photo Detection API
 * POST /api/photo-verification/duplicate-check - 중복 사진 검사
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logging'
import { verifyAuth } from '@/lib/auth'
import crypto from 'crypto'

/**
 * 사진 해시 계산 (URL 기반)
 */
function calculatePhotoHash(photoUrl: string): string {
  return crypto.createHash('sha256').update(photoUrl).digest('hex')
}

/**
 * 중복 사진 검사
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
    const { photoUrl } = body

    // 입력 검증
    if (!photoUrl || typeof photoUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'photoUrl은 필수입니다' },
        { status: 400 }
      )
    }

    // 사진 해시 계산
    const photoHash = calculatePhotoHash(photoUrl)

    // 현재 사용자의 이전 검증 기록 확인
    const userVerifications = await db.photoVerification.findMany({
      where: { userId: user.id },
      select: { photoUrl: true, verified: true, createdAt: true },
    })

    // 중복 검사
    const isDuplicate = userVerifications.some(
      (v) => calculatePhotoHash(v.photoUrl) === photoHash
    )

    // 다른 사용자의 검증된 사진과 중복 검사 (부정행위 방지)
    const samePhotoByOthers = await db.photoVerification.findMany({
      where: {
        photoUrl,
        verified: true,
        userId: { not: user.id },
      },
      select: { userId: true, createdAt: true },
      take: 1,
    })

    let warning = ''
    let canVerify = true

    if (isDuplicate) {
      warning = '이미 이 사진으로 검증을 시도했습니다.'
      canVerify = false
    }

    if (samePhotoByOthers.length > 0) {
      warning = '이 사진은 다른 사용자가 이미 검증했습니다. 새로운 사진을 사용해주세요.'
      canVerify = false

      logger.logSecurity('Duplicate photo attempt detected', {
        userId: user.id,
        previousUser: samePhotoByOthers[0].userId,
      })
    }

    return NextResponse.json({
      success: canVerify,
      data: {
        isDuplicate: !canVerify,
        canVerify,
        warning: warning || undefined,
        previousAttempts: userVerifications.length,
      },
      message: canVerify
        ? '사진 검증이 가능합니다'
        : '사진 검증이 불가능합니다',
    })
  } catch (error) {
    logger.error('Duplicate check endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: '중복 검사 중 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}
