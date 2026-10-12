/**
 * Photo Verification API Endpoint
 * POST /api/photo-verification/verify - 사진 검증
 * GET /api/photo-verification/verify - 검증 기록 조회
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getFacePlusPlusClient } from '@/lib/face-verification'
import { logger } from '@/lib/logging'
import { verifyAuth } from '@/lib/auth'

/**
 * 사진 검증 요청
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

    logger.logSecurity('Photo verification requested', {
      userId: user.id,
      photoUrl: photoUrl.substring(0, 50) + '...',
    })

    // Face++ 클라이언트 확인
    const faceClient = getFacePlusPlusClient()
    if (!faceClient.isConfigured()) {
      logger.error('Face++ not configured', {
        userId: user.id,
      })

      return NextResponse.json(
        {
          success: false,
          error: '사진 검증 서비스가 현재 사용 불가능합니다',
        },
        { status: 503 }
      )
    }

    // 사진 검증 실행
    const verificationResult = await faceClient.verifyPhotoUrl(photoUrl)

    // 데이터베이스에 기록
    const photoVerification = await db.photoVerification.create({
      data: {
        userId: user.id,
        photoUrl,
        verified: verificationResult.verified,
        faceData: verificationResult.verified
          ? JSON.stringify({
              confidence: verificationResult.confidence,
              landmarks: verificationResult.landmarks,
              faceDetails: verificationResult.faceDetails,
            })
          : null,
        error: !verificationResult.verified ? verificationResult.message : null,
      },
    })

    // 검증 성공 시 사용자의 photoVerified 상태 업데이트
    if (verificationResult.verified) {
      await db.user.update({
        where: { id: user.id },
        data: { photoVerified: true },
      })

      logger.logSecurity('Photo verification successful', {
        userId: user.id,
        confidence: verificationResult.confidence,
      })
    } else {
      logger.info('Photo verification failed', {
        userId: user.id,
        reason: verificationResult.message,
      })
    }

    return NextResponse.json({
      success: verificationResult.verified,
      data: {
        id: photoVerification.id,
        verified: verificationResult.verified,
        confidence: verificationResult.confidence,
        message: verificationResult.message,
        faceDetails: verificationResult.faceDetails,
      },
      message: verificationResult.verified
        ? '사진 검증 성공'
        : '사진 검증 실패',
    })
  } catch (error) {
    logger.error('Photo verification endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: '사진 검증 중 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}

/**
 * 검증 기록 조회
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // 쿼리 파라미터
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0)

    // 검증 기록 조회
    const verifications = await db.photoVerification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    })

    // 전체 개수
    const total = await db.photoVerification.count({
      where: { userId: user.id },
    })

    // 최신 검증 기록
    const latestVerification = verifications[0]

    // 데이터 포맷팅
    const formattedVerifications = verifications.map((v) => ({
      id: v.id,
      photoUrl: v.photoUrl,
      verified: v.verified,
      faceData: v.faceData ? JSON.parse(v.faceData) : null,
      error: v.error,
      createdAt: v.createdAt.toISOString(),
    }))

    logger.info('Photo verification history retrieved', {
      userId: user.id,
      count: verifications.length,
    })

    return NextResponse.json({
      success: true,
      data: {
        verifications: formattedVerifications,
        verified: user.photoVerified,
        lastVerification: latestVerification
          ? {
              id: latestVerification.id,
              verified: latestVerification.verified,
              createdAt: latestVerification.createdAt.toISOString(),
            }
          : null,
        pagination: {
          total,
          skip,
          limit,
          hasMore: skip + limit < total,
        },
      },
      message: '검증 기록 조회 성공',
    })
  } catch (error) {
    logger.error('Photo verification history endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: '검증 기록 조회 중 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}
