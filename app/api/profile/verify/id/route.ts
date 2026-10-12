/**
 * 신원 인증 API
 * POST /api/profile/verify/id - 신원 검증 이미지 업로드
 * GET /api/profile/verify/id - 검증 상태 조회
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  uploadIdVerificationImage,
  getProfileVerification,
} from '@/lib/profile-system'
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

    const verification = await getProfileVerification(userId)

    logger.info('신원 인증 상태 조회', {
      userId,
      verified: verification?.idVerified ?? false,
    })

    return NextResponse.json({
      success: true,
      data: verification,
    })
  } catch (error) {
    logger.error('신원 인증 상태 조회 API 오류', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      { success: false, error: '상태 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 필요합니다' },
        { status: 400 }
      )
    }

    const imageBuffer = Buffer.from(await file.arrayBuffer())
    const contentType = file.type

    await uploadIdVerificationImage(userId, imageBuffer, contentType)

    logger.info('신원 검증 이미지 업로드', {
      userId,
      fileSize: imageBuffer.length,
    })

    return NextResponse.json({
      success: true,
      message: '신원 검증 요청이 제출되었습니다. 관리자 검토 후 결과를 알려드리겠습니다.',
    })
  } catch (error) {
    logger.error('신원 검증 이미지 업로드 API 오류', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '이미지 업로드에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
