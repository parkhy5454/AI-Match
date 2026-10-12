/**
 * GET /api/subscription/check-feature
 * 기능 접근 권한 확인 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/jwt'
import {
  checkFeatureAccess,
  checkDailyLimit,
  checkMonthlyLimit,
  isFeatureUnavailable,
} from '@/lib/feature-access'

export async function GET(request: NextRequest) {
  try {
    // JWT 인증
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    const userId = payload.id

    // 쿼리 파라미터
    const searchParams = request.nextUrl.searchParams
    const feature = searchParams.get('feature')
    const checkType = searchParams.get('type') || 'access' // access, daily, monthly, availability

    if (!feature) {
      return NextResponse.json(
        { error: '기능명이 필요합니다' },
        { status: 400 }
      )
    }

    switch (checkType) {
      case 'access': {
        const hasAccess = await checkFeatureAccess(userId, feature)
        return NextResponse.json(
          {
            data: {
              feature,
              hasAccess,
            },
          },
          { status: 200 }
        )
      }

      case 'daily': {
        const limit = await checkDailyLimit(userId, feature)
        return NextResponse.json(
          {
            data: {
              feature,
              ...limit,
            },
          },
          { status: 200 }
        )
      }

      case 'monthly': {
        const limit = await checkMonthlyLimit(userId, feature)
        return NextResponse.json(
          {
            data: {
              feature,
              ...limit,
            },
          },
          { status: 200 }
        )
      }

      case 'availability': {
        const result = await isFeatureUnavailable(userId, feature)
        return NextResponse.json(
          {
            data: {
              feature,
              ...result,
            },
          },
          { status: 200 }
        )
      }

      default:
        return NextResponse.json(
          { error: '유효한 type을 선택해주세요' },
          { status: 400 }
        )
    }
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '기능 확인 중 오류 발생' },
      { status: 500 }
    )
  }
}
