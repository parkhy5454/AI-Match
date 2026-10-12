/**
 * 비디오/음성 통화 시스템
 * WebRTC 기반 실시간 통화 관리
 */

import { db } from './db'
import { logger } from './logging'

/**
 * 통화 유형
 */
export type CallType = 'voice' | 'video'

/**
 * 통화 상태
 */
export type CallStatus = 'pending' | 'active' | 'ended' | 'declined' | 'missed'

/**
 * 통화 필터 타입
 */
export interface CallFilters {
  userId?: string
  callType?: CallType
  status?: CallStatus
  limit?: number
  offset?: number
  startDate?: Date
  endDate?: Date
}

/**
 * 통화 결과 타입
 */
export interface CallResult {
  id: string
  callerId: string
  calleeId: string
  callerName: string
  caleeName: string
  callType: CallType
  status: CallStatus
  startTime?: Date
  endTime?: Date
  duration?: number // 초단위
  createdAt: Date
}

/**
 * ICE 후보자 타입
 */
export interface IceCandidate {
  candidate: string
  sdpMLineIndex: number
  sdpMid: string
}

/**
 * WebRTC Offer/Answer 타입
 */
export interface SessionDescription {
  type: 'offer' | 'answer'
  sdp: string
}

/**
 * 통화 시작 요청
 */
export async function initiateCall(
  callerId: string,
  calleeId: string,
  callType: CallType
): Promise<{
  callId: string
  status: CallStatus
  createdAt: Date
}> {
  try {
    // 자신에게 전화 할 수 없음
    if (callerId === calleeId) {
      throw new Error('자신에게 전화를 걸 수 없습니다')
    }

    // 통화 대상 사용자 확인
    const calleeUser = await db.user.findUnique({
      where: { id: calleeId },
    })

    if (!calleeUser) {
      throw new Error('통화 대상을 찾을 수 없습니다')
    }

    // 양쪽이 차단했는지 확인
    const { isUserBlocked: checkBlocking } = await import(
      './blocking-system'
    )
    const isBlocked = await checkBlocking(callerId, calleeId)

    if (isBlocked) {
      throw new Error('차단된 사용자와 통화할 수 없습니다')
    }

    // 통화 세션 생성
    const callSession = await db.callSession.create({
      data: {
        callerId,
        calleeId,
        callType,
        status: 'pending',
      },
    })

    logger.info('통화 시작 요청', {
      callId: callSession.id,
      callerId,
      calleeId,
      callType,
    })

    return {
      callId: callSession.id,
      status: callSession.status as CallStatus,
      createdAt: callSession.createdAt,
    }
  } catch (error) {
    logger.error('통화 시작 실패', {
      callerId,
      calleeId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 통화 수락
 */
export async function acceptCall(
  callId: string,
  userId: string
): Promise<void> {
  try {
    // 통화 세션 확인
    const callSession = await db.callSession.findUnique({
      where: { id: callId },
    })

    if (!callSession) {
      throw new Error('통화 세션을 찾을 수 없습니다')
    }

    // 수신자 확인
    if (callSession.calleeId !== userId) {
      throw new Error('이 통화를 수락할 권한이 없습니다')
    }

    // 상태 확인
    if (callSession.status !== 'pending') {
      throw new Error('이미 처리된 통화입니다')
    }

    // 통화 상태 업데이트
    await db.callSession.update({
      where: { id: callId },
      data: {
        status: 'active',
        startTime: new Date(),
      },
    })

    logger.info('통화 수락됨', {
      callId,
      callerId: callSession.callerId,
      calleeId: userId,
    })
  } catch (error) {
    logger.error('통화 수락 실패', {
      callId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 통화 거절
 */
export async function declineCall(
  callId: string,
  userId: string
): Promise<void> {
  try {
    // 통화 세션 확인
    const callSession = await db.callSession.findUnique({
      where: { id: callId },
    })

    if (!callSession) {
      throw new Error('통화 세션을 찾을 수 없습니다')
    }

    // 권한 확인 (발신자 또는 수신자만 거절 가능)
    if (
      callSession.callerId !== userId &&
      callSession.calleeId !== userId
    ) {
      throw new Error('이 통화를 거절할 권한이 없습니다')
    }

    // 상태 확인
    if (callSession.status !== 'pending') {
      throw new Error('이미 처리된 통화입니다')
    }

    // 통화 상태 업데이트 (declined)
    await db.callSession.update({
      where: { id: callId },
      data: {
        status: 'declined',
        endTime: new Date(),
      },
    })

    logger.info('통화 거절됨', {
      callId,
      declinedByUserId: userId,
    })
  } catch (error) {
    logger.error('통화 거절 실패', {
      callId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 통화 종료
 */
export async function endCall(
  callId: string,
  userId: string
): Promise<{
  callId: string
  duration: number
  status: CallStatus
}> {
  try {
    // 통화 세션 확인
    const callSession = await db.callSession.findUnique({
      where: { id: callId },
    })

    if (!callSession) {
      throw new Error('통화 세션을 찾을 수 없습니다')
    }

    // 권한 확인
    if (
      callSession.callerId !== userId &&
      callSession.calleeId !== userId
    ) {
      throw new Error('이 통화를 종료할 권한이 없습니다')
    }

    // 통화 시간 계산
    let duration = 0
    if (callSession.startTime) {
      const endTime = new Date()
      duration = Math.floor(
        (endTime.getTime() - callSession.startTime.getTime()) / 1000
      )
    }

    // 상태 업데이트 (ended 또는 missed)
    const status = callSession.status === 'active' ? 'ended' : 'missed'

    await db.callSession.update({
      where: { id: callId },
      data: {
        status,
        endTime: new Date(),
        duration: callSession.status === 'active' ? duration : undefined,
      },
    })

    logger.info('통화 종료', {
      callId,
      endedByUserId: userId,
      duration,
      status,
    })

    return {
      callId,
      duration,
      status: status as CallStatus,
    }
  } catch (error) {
    logger.error('통화 종료 실패', {
      callId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 통화 미응답 처리 (타임아웃)
 */
export async function markCallAsMissed(callId: string): Promise<void> {
  try {
    const callSession = await db.callSession.findUnique({
      where: { id: callId },
    })

    if (!callSession) {
      return
    }

    // pending 상태만 missed로 변경
    if (callSession.status === 'pending') {
      await db.callSession.update({
        where: { id: callId },
        data: {
          status: 'missed',
          endTime: new Date(),
        },
      })

      logger.info('통화 미응답 처리', {
        callId,
        callerId: callSession.callerId,
        calleeId: callSession.calleeId,
      })
    }
  } catch (error) {
    logger.error('통화 미응답 처리 실패', {
      callId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * 통화 이력 조회
 */
export async function getCallHistory(
  userId: string,
  filters?: CallFilters
): Promise<{
  calls: CallResult[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}> {
  try {
    const limit = Math.min(filters?.limit || 50, 100)
    const offset = filters?.offset || 0

    // WHERE 조건 구성
    const where: Record<string, any> = {
      OR: [
        { callerId: userId },
        { calleeId: userId },
      ],
    }

    // 통화 유형 필터
    if (filters?.callType) {
      where.callType = filters.callType
    }

    // 통화 상태 필터
    if (filters?.status) {
      where.status = filters.status
    }

    // 날짜 범위 필터
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {}
      if (filters?.startDate) {
        where.createdAt.gte = filters.startDate
      }
      if (filters?.endDate) {
        where.createdAt.lte = filters.endDate
      }
    }

    // 통화 이력 조회
    const [calls, total] = await Promise.all([
      db.callSession.findMany({
        where,
        include: {
          caller: {
            select: {
              id: true,
              username: true,
            },
          },
          callee: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.callSession.count({ where }),
    ])

    const hasMore = offset + limit < total

    logger.info('통화 이력 조회', {
      userId,
      count: calls.length,
      total,
    })

    return {
      calls: calls.map((call) => ({
        id: call.id,
        callerId: call.callerId,
        calleeId: call.calleeId,
        callerName: call.caller.username,
        caleeName: call.callee.username,
        callType: call.callType as CallType,
        status: call.status as CallStatus,
        startTime: call.startTime || undefined,
        endTime: call.endTime || undefined,
        duration: call.duration || undefined,
        createdAt: call.createdAt,
      })),
      total,
      limit,
      offset,
      hasMore,
    }
  } catch (error) {
    logger.error('통화 이력 조회 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 특정 통화 세션 조회
 */
export async function getCallSession(callId: string) {
  try {
    const callSession = await db.callSession.findUnique({
      where: { id: callId },
      include: {
        caller: {
          select: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
        callee: {
          select: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
      },
    })

    return callSession
  } catch (error) {
    logger.error('통화 세션 조회 오류', {
      callId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 진행 중인 통화 확인
 */
export async function getActiveCall(
  userId: string
): Promise<{
  id: string
  otherUserId: string
  otherUserName: string
  callType: CallType
  duration: number // 초단위
} | null> {
  try {
    const activeCall = await db.callSession.findFirst({
      where: {
        OR: [
          { callerId: userId },
          { calleeId: userId },
        ],
        status: 'active',
      },
      include: {
        caller: {
          select: { id: true, username: true },
        },
        callee: {
          select: { id: true, username: true },
        },
      },
    })

    if (!activeCall) {
      return null
    }

    // 상대방 정보
    const isInitiator = activeCall.callerId === userId
    const otherUser = isInitiator ? activeCall.callee : activeCall.caller

    // 통화 지속 시간 계산
    const duration = activeCall.startTime
      ? Math.floor(
          (new Date().getTime() - activeCall.startTime.getTime()) / 1000
        )
      : 0

    return {
      id: activeCall.id,
      otherUserId: otherUser.id,
      otherUserName: otherUser.username,
      callType: activeCall.callType as CallType,
      duration,
    }
  } catch (error) {
    logger.error('진행 중인 통화 확인 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

/**
 * 대기 중인 통화 확인 (수신 대기)
 */
export async function getPendingCall(
  userId: string
): Promise<{
  id: string
  callerId: string
  callerName: string
  callerImage?: string
  callType: CallType
  createdAt: Date
} | null> {
  try {
    const pendingCall = await db.callSession.findFirst({
      where: {
        calleeId: userId,
        status: 'pending',
      },
      include: {
        caller: {
          select: {
            id: true,
            username: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!pendingCall) {
      return null
    }

    return {
      id: pendingCall.id,
      callerId: pendingCall.caller.id,
      callerName: pendingCall.caller.username,
      callerImage: pendingCall.caller.profileImage || undefined,
      callType: pendingCall.callType as CallType,
      createdAt: pendingCall.createdAt,
    }
  } catch (error) {
    logger.error('대기 중인 통화 확인 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

/**
 * 통화 통계 조회
 */
export async function getCallStatistics(userId: string): Promise<{
  totalCalls: number
  totalDuration: number // 초단위
  missedCalls: number
  declinedCalls: number
  averageDuration: number // 초단위
  lastCallDate?: Date
}> {
  try {
    const calls = await db.callSession.findMany({
      where: {
        OR: [
          { callerId: userId },
          { calleeId: userId },
        ],
        status: { in: ['ended', 'missed', 'declined'] },
      },
    })

    const totalCalls = calls.length
    const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0)
    const missedCalls = calls.filter((call) => call.status === 'missed').length
    const declinedCalls = calls.filter((call) => call.status === 'declined')
      .length
    const completedCalls = calls.filter((call) => call.status === 'ended').length
    const averageDuration =
      completedCalls > 0 ? Math.floor(totalDuration / completedCalls) : 0

    const lastCall = calls.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0]

    logger.info('통화 통계 조회', {
      userId,
      totalCalls,
      totalDuration,
      missedCalls,
    })

    return {
      totalCalls,
      totalDuration,
      missedCalls,
      declinedCalls,
      averageDuration,
      lastCallDate: lastCall?.createdAt,
    }
  } catch (error) {
    logger.error('통화 통계 조회 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}
