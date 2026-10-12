/**
 * 프로필 이미지 관리 API
 * GET /api/profile/images - 이미지 목록 조회
 * POST /api/profile/images - 이미지 업로드
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  uploadProfileImage,
  getProfileImages,
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

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId') || userId

    const images = await getProfileImages(targetUserId)

    logger.info('프로필 이미지 조회', {
      userId,
      targetUserId,
      count: images.length,
    })

    return NextResponse.json({
      success: true,
      data: images,
    })
  } catch (error) {
    logger.error('프로필 이미지 조회 API 오류', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      { success: false, error: '이미지 조회에 실패했습니다' },
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

    const profileImage = await uploadProfileImage(
      userId,
      imageBuffer,
      contentType
    )

    logger.info('프로필 이미지 업로드', {
      userId,
      imageId: profileImage.id,
      fileSize: imageBuffer.length,
    })

    return NextResponse.json({
      success: true,
      data: profileImage,
      message: '이미지가 업로드되었습니다',
    })
  } catch (error) {
    logger.error('프로필 이미지 업로드 API 오류', error instanceof Error ? error : new Error(String(error)))

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
