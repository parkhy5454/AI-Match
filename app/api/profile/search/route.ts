/**
 * 프로필 검색 API
 * GET /api/profile/search - 조건에 맞는 프로필 검색
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchProfiles } from '@/lib/profile-system'
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
    const minAge = searchParams.get('minAge')
    const maxAge = searchParams.get('maxAge')
    const gender = searchParams.get('gender')
    const interests = searchParams.get('interests')
    const relationshipGoals = searchParams.get('relationshipGoals')
    const maxDistance = searchParams.get('maxDistance')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const offset = (page - 1) * limit

    const profiles = await searchProfiles(
      userId,
      {
        minAge: minAge ? parseInt(minAge) : undefined,
        maxAge: maxAge ? parseInt(maxAge) : undefined,
        gender: (gender as 'male' | 'female' | 'other') || undefined,
        interests: interests ? interests.split(',') : undefined,
        relationshipGoals: relationshipGoals
          ? (relationshipGoals.split(',') as Array<
              'dating' | 'relationship' | 'marriage' | 'friendship'
            >)
          : undefined,
        maxDistance: maxDistance ? parseInt(maxDistance) : undefined
      },
      limit,
      offset
    )

    logger.info('프로필 검색', {
      userId,
      filters: {
        minAge,
        maxAge,
        gender,
        interests,
        relationshipGoals
      },
      resultCount: profiles.length,
      page
    })

    return NextResponse.json({
      success: true,
      data: {
        profiles,
        pagination: {
          page,
          limit,
          count: profiles.length
        }
      }
    })
  } catch (error) {
    logger.error('프로필 검색 API 오류', error instanceof Error ? error : new Error(String(error))))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '프로필 검색에 실패했습니다'
      },
      { status: 500 }
    )
  }
}
