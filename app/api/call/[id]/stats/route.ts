/**
 * 통화 통계 API
 * GET /api/call/[id]/stats - 통화 통계 조회
 * POST /api/call/[id]/stats - 통화 통계 기록
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  recordCallStatistics,
  getCallStatistics,
  evaluateCallQuality,
  getAdaptiveBitrate,
} from '@/lib/video-call-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'

interface RecordStatsRequest {
  videoBitrate: number
  audioBitrate: number
  frameRate: number
  resolution: string
  packetLoss: number
  latency: number
  jitter: number
  audioLevel: number
}

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]

    if (!token) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const userId = verifyToken(token)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const callId = params.id
    const stats = await getCallStatistics(callId, userId)

    logger.info('통화 통계 조회', { callId, userId })

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    logger.error('통화 통계 조회 API 오류', {
      callId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '통계 조회에 실패했습니다',
      },
      { status: 500 }
    )
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

    const userId = verifyToken(token)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const body: RecordStatsRequest = await request.json()
    const callId = params.id

    const stats = await recordCallStatistics(callId, userId, {
      videoBitrate: body.videoBitrate,
      audioBitrate: body.audioBitrate,
      frameRate: body.frameRate,
      resolution: body.resolution,
      packetLoss: body.packetLoss,
      latency: body.latency,
      jitter: body.jitter,
      audioLevel: body.audioLevel,
    })

    // 품질 평가
    const quality = evaluateCallQuality({
      videoBitrate: body.videoBitrate,
      audioBitrate: body.audioBitrate,
      frameRate: body.frameRate,
      resolution: body.resolution,
      packetLoss: body.packetLoss,
      latency: body.latency,
      jitter: body.jitter,
      audioLevel: body.audioLevel,
    })

    // 적응형 비트레이트 조정
    const totalBandwidth = body.videoBitrate + body.audioBitrate
    const adaptiveBitrate = getAdaptiveBitrate(
      totalBandwidth,
      quality.quality
    )

    logger.info('통화 통계 기록', {
      callId,
      userId,
      quality: quality.quality,
      bitrate: body.videoBitrate,
      latency: body.latency,
    })

    return NextResponse.json({
      success: true,
      data: {
        statistics: stats,
        quality,
        adaptiveBitrate,
      },
      message: '통화 통계가 기록되었습니다',
    })
  } catch (error) {
    logger.error('통화 통계 기록 API 오류', {
      callId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '통계 기록에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
