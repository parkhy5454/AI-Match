/**
 * WebSocket 통화 통합
 * Socket.io 기반 WebRTC 신호 처리
 */

import { Server as SocketIOServer, Socket } from 'socket.io'
import { logger } from './logging'
import {
  acceptCall,
  declineCall,
  endCall,
  markCallAsMissed,
} from './calling-system'

/**
 * 활성 통화 추적
 */
interface ActiveCall {
  callId: string
  callerId: string
  calleeId: string
  callerSocketId: string
  calleeSocketId?: string
  callType: 'voice' | 'video'
  startTime: Date
}

/**
 * 통화 신호 처리 설정
 */
export function setupCallingSignaling(io: SocketIOServer) {
  // 활성 통화 저장소
  const activeCalls = new Map<string, ActiveCall>()
  const userSocketMap = new Map<string, string>() // userId -> socketId

  // 사용자 온라인 상태
  const onlineUsers = new Map<string, { userId: string; username: string }>()

  /**
   * 통화 시작 신호
   */
  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.auth.userId
    const username = socket.handshake.auth.username

    if (userId) {
      userSocketMap.set(userId, socket.id)
      onlineUsers.set(socket.id, { userId, username })

      logger.info('사용자 연결됨', { userId, socketId: socket.id })
    }

    /**
     * 통화 제안 (Offer) - 발신자가 수신자에게 전송
     */
    socket.on(
      'call:initiate',
      (data: {
        callId: string
        calleeId: string
        callType: 'voice' | 'video'
        offer: { type: string; sdp: string }
      }) => {
        try {
          const calleeSocketId = userSocketMap.get(data.calleeId)

          if (!calleeSocketId) {
            socket.emit('call:error', {
              callId: data.callId,
              error: '사용자가 온라인 상태가 아닙니다',
            })
            return
          }

          // 활성 통화 등록
          activeCalls.set(data.callId, {
            callId: data.callId,
            callerId: userId,
            calleeId: data.calleeId,
            callerSocketId: socket.id,
            callType: data.callType,
            startTime: new Date(),
          })

          // 수신자에게 통화 제안 전달
          io.to(calleeSocketId).emit('call:incoming', {
            callId: data.callId,
            callerId: userId,
            callerName: username,
            callType: data.callType,
            offer: data.offer,
          })

          logger.info('통화 제안 전송', {
            callId: data.callId,
            callerId: userId,
            calleeId: data.calleeId,
            callType: data.callType,
          })
        } catch (error) {
          logger.error('통화 제안 실패', {
            callId: data.callId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          socket.emit('call:error', {
            callId: data.callId,
            error: '통화 제안 실패',
          })
        }
      }
    )

    /**
     * 통화 수락 (Answer) - 수신자가 발신자에게 전송
     */
    socket.on(
      'call:accept',
      async (data: {
        callId: string
        answer: { type: string; sdp: string }
      }) => {
        try {
          const activeCall = activeCalls.get(data.callId)

          if (!activeCall) {
            socket.emit('call:error', {
              callId: data.callId,
              error: '통화 세션을 찾을 수 없습니다',
            })
            return
          }

          // 데이터베이스 업데이트
          await acceptCall(data.callId, userId)

          // 소켓 업데이트
          activeCall.calleeSocketId = socket.id

          // 발신자에게 Answer 전달
          io.to(activeCall.callerSocketId).emit('call:accepted', {
            callId: data.callId,
            answer: data.answer,
          })

          // 양쪽에 통화 시작 알림
          io.to(activeCall.callerSocketId).emit('call:started', {
            callId: data.callId,
            startTime: activeCall.startTime,
          })

          socket.emit('call:started', {
            callId: data.callId,
            startTime: activeCall.startTime,
          })

          logger.info('통화 수락됨', {
            callId: data.callId,
            callerId: activeCall.callerId,
            calleeId: userId,
          })
        } catch (error) {
          logger.error('통화 수락 실패', {
            callId: data.callId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          socket.emit('call:error', {
            callId: data.callId,
            error: '통화 수락 실패',
          })
        }
      }
    )

    /**
     * 통화 거절
     */
    socket.on(
      'call:decline',
      async (data: { callId: string }) => {
        try {
          const activeCall = activeCalls.get(data.callId)

          if (!activeCall) {
            return
          }

          // 데이터베이스 업데이트
          await declineCall(data.callId, userId)

          // 발신자에게 거절 알림
          io.to(activeCall.callerSocketId).emit('call:declined', {
            callId: data.callId,
            reason: '수신자가 거절했습니다',
          })

          // 활성 통화에서 제거
          activeCalls.delete(data.callId)

          logger.info('통화 거절됨', {
            callId: data.callId,
            declinedByUserId: userId,
          })
        } catch (error) {
          logger.error('통화 거절 처리 실패', {
            callId: data.callId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    )

    /**
     * ICE 후보자 교환 (발신자 -> 수신자)
     */
    socket.on(
      'call:ice-candidate-caller',
      (data: {
        callId: string
        candidate: {
          candidate: string
          sdpMLineIndex: number
          sdpMid: string
        }
      }) => {
        try {
          const activeCall = activeCalls.get(data.callId)

          if (!activeCall || !activeCall.calleeSocketId) {
            return
          }

          // 수신자에게 ICE 후보자 전달
          io.to(activeCall.calleeSocketId).emit('call:ice-candidate-callee', {
            callId: data.callId,
            candidate: data.candidate,
          })
        } catch (error) {
          logger.error('ICE 후보자 전달 실패 (발신자)', {
            callId: data.callId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    )

    /**
     * ICE 후보자 교환 (수신자 -> 발신자)
     */
    socket.on(
      'call:ice-candidate-callee',
      (data: {
        callId: string
        candidate: {
          candidate: string
          sdpMLineIndex: number
          sdpMid: string
        }
      }) => {
        try {
          const activeCall = activeCalls.get(data.callId)

          if (!activeCall) {
            return
          }

          // 발신자에게 ICE 후보자 전달
          io.to(activeCall.callerSocketId).emit('call:ice-candidate-caller', {
            callId: data.callId,
            candidate: data.candidate,
          })
        } catch (error) {
          logger.error('ICE 후보자 전달 실패 (수신자)', {
            callId: data.callId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    )

    /**
     * 통화 종료
     */
    socket.on(
      'call:end',
      async (data: { callId: string }) => {
        try {
          const activeCall = activeCalls.get(data.callId)

          if (!activeCall) {
            return
          }

          // 데이터베이스 업데이트
          await endCall(data.callId, userId)

          // 상대방에게 통화 종료 알림
          const otherSocketId =
            userId === activeCall.callerId
              ? activeCall.calleeSocketId
              : activeCall.callerSocketId

          if (otherSocketId) {
            io.to(otherSocketId).emit('call:ended', {
              callId: data.callId,
              endedByUserId: userId,
            })
          }

          // 활성 통화에서 제거
          activeCalls.delete(data.callId)

          logger.info('통화 종료됨', {
            callId: data.callId,
            endedByUserId: userId,
          })
        } catch (error) {
          logger.error('통화 종료 처리 실패', {
            callId: data.callId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    )

    /**
     * 온라인 사용자 목록 요청
     */
    socket.on('users:online', (callback) => {
      try {
        const onlineUsersList = Array.from(onlineUsers.values()).map((u) => ({
          userId: u.userId,
          username: u.username,
          isOnline: true,
        }))

        callback(onlineUsersList)
      } catch (error) {
        logger.error('온라인 사용자 목록 조회 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        callback([])
      }
    })

    /**
     * 사용자 연결 해제
     */
    socket.on('disconnect', async () => {
      try {
        // 사용자 맵에서 제거
        userSocketMap.delete(userId)
        onlineUsers.delete(socket.id)

        // 진행 중인 통화 종료 처리
        for (const [callId, activeCall] of activeCalls.entries()) {
          if (
            activeCall.callerSocketId === socket.id ||
            activeCall.calleeSocketId === socket.id
          ) {
            try {
              // 상태에 따라 처리
              if (activeCall.calleeSocketId === socket.id) {
                // 수신자가 연결 해제
                await markCallAsMissed(callId)
              } else {
                // 발신자가 연결 해제
                await endCall(callId, activeCall.callerId)
              }

              // 상대방에게 알림
              const otherSocketId =
                activeCall.calleeSocketId === socket.id
                  ? activeCall.callerSocketId
                  : activeCall.calleeSocketId

              if (otherSocketId) {
                io.to(otherSocketId).emit('call:ended', {
                  callId,
                  reason: '상대방이 연결을 해제했습니다',
                })
              }
            } catch (error) {
              logger.error('연결 해제 시 통화 정리 실패', {
                callId,
                error:
                  error instanceof Error
                    ? error.message
                    : 'Unknown error',
              })
            }

            activeCalls.delete(callId)
          }
        }

        logger.info('사용자 연결 해제', { userId, socketId: socket.id })
      } catch (error) {
        logger.error('연결 해제 처리 실패', {
          userId,
          socketId: socket.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  })

  // 통화 정보 조회 함수 반환
  return {
    getActiveCall: (callId: string) => activeCalls.get(callId),
    getUserSocketId: (userId: string) => userSocketMap.get(userId),
    isUserOnline: (userId: string) => userSocketMap.has(userId),
  }
}
