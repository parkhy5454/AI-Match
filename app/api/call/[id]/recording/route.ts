/**
 * 통화 녹음 API
 * POST /api/call/[id]/recording - 녹음 시작
 * DELETE /api/call/[id]/recording - 녹음 종료
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  startRecording,
  stopRecording,
} from '@/lib/video-call-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

interface StopRecordingRequest {
  recordingId: string
  fileSize: number
  duration: number
}

interface RouteParams {
  params: {
    id: string
  }
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = payload.userId
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const callId = params.id
    const recording = await startRecording(callId, userId)

    logger.info('통화 녹음 시작', {
      callId,
      userId,
      recordingId: recording.id,
    })

    return NextResponse.json({
      success: true,
      data: recording,
      message: '통화 녹음이 시작되었습니다',
    })
  } catch (error) {
    logger.error('통화 녹음 시작 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '녹음 시작에 실패했습니다',
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = payload.userId
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const body: StopRecordingRequest = await request.json()

    const recording = await stopRecording(
      body.recordingId,
      body.fileSize,
      body.duration
    )

    logger.info('통화 녹음 종료', {
      callId: params.id,
      userId,
      recordingId: body.recordingId,
      fileSize: body.fileSize,
      duration: body.duration,
    })

    return NextResponse.json({
      success: true,
      data: recording,
      message: '통화 녹음이 종료되었습니다',
    })
  } catch (error) {
    logger.error('통화 녹음 종료 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '녹음 종료에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
