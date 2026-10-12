/**
 * 매칭 목록 조회 API
 * GET /api/interactions/matches
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logging'
import { verifyJWT } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // JWT 인증
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { success: false, error: '인증 토큰이 필요합니다' },
        { status: 401 }
      )
    }

    const decoded = verifyJWT(token)
    if (!decoded?.sub) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      )
    }

    const userId = decoded.sub

    // 쿼리 파라미터
    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0

    // 입력 검증
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: '제한은 1~100 사이여야 합니다' },
        { status: 400 }
      )
    }

    // 매칭 목록 조회
    const matches = await db.match.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            profileImage: true,
            age: true,
            location: true,
            mbtiType: true,
            bio: true,
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            profileImage: true,
            age: true,
            location: true,
            mbtiType: true,
            bio: true,
          },
        },
      },
      orderBy: { matchedAt: 'desc' },
      take: limit,
      skip: offset,
    })

    // 전체 매칭 수
    const totalCount = await db.match.count({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
    })

    // 매칭 정보 변환
    const matchedUsers = matches.map((match) => {
      const matchedUser = match.user1Id === userId ? match.user2 : match.user1

      return {
        matchId: match.id,
        user: matchedUser,
        matchedAt: match.matchedAt,
        unreadMessageCount: 0, // 추후 구현
      }
    })

    logger.info('매칭 목록 조회', {
      userId,
      count: matches.length,
      total: totalCount,
    })

    return NextResponse.json({
      success: true,
      data: {
        matches: matchedUsers,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
      },
      message: '매칭 목록 조회 성공',
    })
  } catch (error) {
    logger.error('매칭 목록 조회 실패', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        success: false,
        error: '매칭 목록 조회 중 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}
