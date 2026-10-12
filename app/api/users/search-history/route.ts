/**
 * 검색 이력 API
 * GET: 검색 이력 조회
 * DELETE: 검색 이력 삭제
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/auth'
import {
  getSearchHistory,
  deleteSearchHistory,
  clearSearchHistory,
} from '@/lib/search-engine'
import { logger } from '@/lib/logging'

/**
 * GET /api/users/search-history?limit=20&offset=0
 * 검색 이력 조회
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다' },
        { status: 401 }
      )
    }

    const decoded = verifyJWT(token)
    if (!decoded || !decoded.sub) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const userId = decoded.sub
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '20'),
      50
    )
    const offset = parseInt(searchParams.get('offset') || '0') || 0

    const result = await getSearchHistory(userId, limit, offset)

    logger.info('검색 이력 조회', {
      userId,
      count: result.history.length,
    })

    return NextResponse.json({
      success: true,
      data: result.history,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + limit < result.total,
      },
    })
  } catch (error) {
    logger.error('검색 이력 조회 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { error: '검색 이력 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/users/search-history?id=historyId
 * 검색 이력 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다' },
        { status: 401 }
      )
    }

    const decoded = verifyJWT(token)
    if (!decoded || !decoded.sub) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const userId = decoded.sub
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const clear = searchParams.get('clear') === 'true'

    if (clear) {
      // 모든 검색 이력 삭제
      const count = await clearSearchHistory(userId)

      logger.info('모든 검색 이력 삭제', {
        userId,
        count,
      })

      return NextResponse.json({
        success: true,
        message: `${count}개의 검색 이력이 삭제되었습니다`,
      })
    } else {
      // 특정 검색 이력 삭제
      if (!id) {
        return NextResponse.json(
          { error: '이력 ID가 필요합니다' },
          { status: 400 }
        )
      }

      const success = await deleteSearchHistory(userId, id)

      if (!success) {
        return NextResponse.json(
          { error: '이력을 찾을 수 없습니다' },
          { status: 404 }
        )
      }

      logger.info('검색 이력 삭제', {
        userId,
        historyId: id,
      })

      return NextResponse.json({
        success: true,
        message: '검색 이력이 삭제되었습니다',
      })
    }
  } catch (error) {
    logger.error('검색 이력 삭제 API 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { error: '검색 이력 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
