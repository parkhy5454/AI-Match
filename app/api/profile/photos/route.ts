/**
 * 사진 관리 API
 * POST /api/profile/photos - 사진 업로드
 * GET /api/profile/photos - 사용자의 사진 목록 조회
 * PUT /api/profile/photos/reorder - 사진 순서 변경
 * DELETE /api/profile/photos/[photoId] - 사진 삭제
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  uploadProfilePhoto,
  getUserPhotos,
  reorderPhotos,
  deletePhoto
} from '@/lib/profile-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

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

    const buffer = Buffer.from(await file.arrayBuffer())

    const photo = await uploadProfilePhoto(userId, {
      file: buffer,
      mimeType: file.type,
      fileName: file.name
    })

    logger.info('사진 업로드', {
      userId,
      fileName: file.name,
      fileSize: file.size
    })

    return NextResponse.json({
      success: true,
      data: photo,
      message: '사진이 업로드되었습니다'
    })
  } catch (error) {
    logger.error('사진 업로드 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '사진 업로드에 실패했습니다'
      },
      { status: 500 }
    )
  }
}

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

    const photos = await getUserPhotos(userId)

    logger.info('사진 목록 조회', { userId, count: photos.length })

    return NextResponse.json({
      success: true,
      data: photos
    })
  } catch (error) {
    logger.error('사진 목록 조회 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '사진 목록 조회에 실패했습니다'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()

    if (!body.photoOrder || !Array.isArray(body.photoOrder)) {
      return NextResponse.json(
        { success: false, error: '사진 순서 배열이 필요합니다' },
        { status: 400 }
      )
    }

    const photos = await reorderPhotos(userId, body.photoOrder)

    logger.info('사진 순서 변경', { userId, count: photos.length })

    return NextResponse.json({
      success: true,
      data: photos,
      message: '사진 순서가 변경되었습니다'
    })
  } catch (error) {
    logger.error('사진 순서 변경 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '사진 순서 변경에 실패했습니다'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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
    const photoId = searchParams.get('photoId')

    if (!photoId) {
      return NextResponse.json(
        { success: false, error: '사진 ID가 필요합니다' },
        { status: 400 }
      )
    }

    await deletePhoto(userId, photoId)

    logger.info('사진 삭제', { userId, photoId })

    return NextResponse.json({
      success: true,
      message: '사진이 삭제되었습니다'
    })
  } catch (error) {
    logger.error('사진 삭제 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '사진 삭제에 실패했습니다'
      },
      { status: 500 }
    )
  }
}
