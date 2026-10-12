/**
 * 휴대폰 인증 API
 * POST /api/profile/verify/phone - 인증 코드 전송
 * POST /api/profile/verify/phone/confirm - 인증 코드 확인
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  sendPhoneVerificationCode,
  verifyPhoneCode,
} from '@/lib/profile-system'
import { verifyToken } from '@/lib/auth'
import { logger } from '@/lib/logging'
import { db } from '@/lib/db'

interface PhoneVerificationRequest {
  phoneNumber?: string
  code?: string
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

    const body: PhoneVerificationRequest = await request.json()
    const { phoneNumber, code } = body

    // 인증 코드 확인 요청
    if (code) {
      await verifyPhoneCode(userId, code)

      logger.info('휴대폰 인증 완료', {
        userId,
      })

      return NextResponse.json({
        success: true,
        message: '휴대폰 인증이 완료되었습니다',
      })
    }

    // 인증 코드 전송 요청
    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: '휴대폰 번호가 필요합니다' },
        { status: 400 }
      )
    }

    // 휴대폰 번호 형식 검증
    const phoneRegex = /^(\+82|0)[0-9]{9,10}$/
    if (!phoneRegex.test(phoneNumber.replace(/[-\s]/g, ''))) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 휴대폰 번호입니다' },
        { status: 400 }
      )
    }

    // 사용자 휴대폰 번호 업데이트
    await db.user.update({
      where: { id: userId },
      data: { phoneNumber },
    })

    await sendPhoneVerificationCode(userId, phoneNumber)

    logger.info('휴대폰 인증 코드 전송', {
      userId,
      phoneNumber: phoneNumber.slice(-4).padStart(phoneNumber.length, '*'),
    })

    return NextResponse.json({
      success: true,
      message: '인증 코드가 전송되었습니다',
      data: {
        expiresIn: 600, // 10분
      },
    })
  } catch (error) {
    logger.error('휴대폰 인증 API 오류', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '휴대폰 인증에 실패했습니다',
      },
      { status: 500 }
    )
  }
}
