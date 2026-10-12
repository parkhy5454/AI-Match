'use client'

/**
 * 통화 시스템 Context
 * 클라이언트 측 WebRTC 및 통화 상태 관리
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from 'react'

interface CallInfo {
  id: string
  type: 'voice' | 'video'
  otherUserId: string
  otherUserName: string
  otherUserImage?: string
  status: 'pending' | 'active' | 'ended'
  startTime: Date
  duration: number // 초단위
  peerConnection?: RTCPeerConnection
}

interface CallStatistics {
  totalCalls: number
  totalDuration: number
  averageDuration: number
  missedCalls: number
  declinedCalls: number
  lastCallDate?: Date
}

interface CallingContextType {
  // 상태
  currentCall: CallInfo | null
  incomingCall: {
    id: string
    callerId: string
    callerName: string
    callerImage?: string
    type: 'voice' | 'video'
    createdAt: Date
  } | null
  callStats: CallStatistics | null
  isCallActive: boolean
  loadingCall: boolean

  // 통화 함수
  initiateCall: (calleeId: string, callType: 'voice' | 'video') => Promise<string>
  acceptCall: (callId: string) => Promise<void>
  declineCall: (callId: string) => Promise<void>
  endCall: (callId: string) => Promise<void>

  // ICE 후보자
  addIceCandidate: (candidate: RTCIceCandidate) => Promise<void>

  // 정보 조회
  getCallHistory: (
    limit?: number,
    offset?: number
  ) => Promise<any>
  getCallStatistics: () => Promise<void>
  getActiveCall: () => Promise<void>
  getPendingCall: () => Promise<void>

  // WebRTC
  createPeerConnection: () => RTCPeerConnection
  createOffer: () => Promise<RTCSessionDescriptionInit>
  createAnswer: (offer: RTCSessionDescription) => Promise<RTCSessionDescriptionInit>
  setRemoteDescription: (
    description: RTCSessionDescriptionInit
  ) => Promise<void>

  // 미디어
  getLocalStream: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  stopLocalStream: (stream: MediaStream) => void

  // 상태 초기화
  clearCall: () => void
}

const CallingContext = createContext<CallingContextType | undefined>(
  undefined
)

interface CallingProviderProps {
  children: React.ReactNode
  token: string
}

/**
 * 통화 시스템 Context Provider
 */
export function CallingProvider({ children, token }: CallingProviderProps) {
  const [currentCall, setCurrentCall] = useState<CallInfo | null>(null)
  const [incomingCall, setIncomingCall] = useState<any>(null)
  const [callStats, setCallStats] = useState<CallStatistics | null>(null)
  const [loadingCall, setLoadingCall] = useState(false)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  /**
   * 통화 시작
   */
  const initiateCall = useCallback(
    async (calleeId: string, callType: 'voice' | 'video'): Promise<string> => {
      setLoadingCall(true)
      try {
        const response = await fetch('/api/calling/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ calleeId, callType }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '통화 시작 실패')
        }

        const data = await response.json()
        const callId = data.data.callId

        console.info('통화 시작 요청됨', { callId, calleeId, callType })

        return callId
      } catch (error) {
        console.error('통화 시작 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        throw error
      } finally {
        setLoadingCall(false)
      }
    },
    [token]
  )

  /**
   * 통화 수락
   */
  const acceptCall = useCallback(
    async (callId: string): Promise<void> => {
      setLoadingCall(true)
      try {
        const response = await fetch('/api/calling/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ callId }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '통화 수락 실패')
        }

        setIncomingCall(null)
        console.info('통화 수락됨', { callId })
      } catch (error) {
        console.error('통화 수락 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        throw error
      } finally {
        setLoadingCall(false)
      }
    },
    [token]
  )

  /**
   * 통화 거절
   */
  const declineCall = useCallback(
    async (callId: string): Promise<void> => {
      try {
        const response = await fetch('/api/calling/decline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ callId }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '통화 거절 실패')
        }

        setIncomingCall(null)
        console.info('통화 거절됨', { callId })
      } catch (error) {
        console.error('통화 거절 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        throw error
      }
    },
    [token]
  )

  /**
   * 통화 종료
   */
  const endCall = useCallback(
    async (callId: string): Promise<void> => {
      try {
        const response = await fetch('/api/calling/end', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ callId }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '통화 종료 실패')
        }

        // 로컬 스트림 정지
        if (localStreamRef.current) {
          stopLocalStream(localStreamRef.current)
        }

        // 피어 연결 종료
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close()
          peerConnectionRef.current = null
        }

        setCurrentCall(null)
        console.info('통화 종료됨', { callId })
      } catch (error) {
        console.error('통화 종료 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        throw error
      }
    },
    [token]
  )

  /**
   * ICE 후보자 추가
   */
  const addIceCandidate = useCallback(
    async (candidate: RTCIceCandidate): Promise<void> => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(candidate)
        } catch (error) {
          console.error('ICE 후보자 추가 실패', {
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    },
    []
  )

  /**
   * 통화 이력 조회
   */
  const getCallHistory = useCallback(
    async (limit: number = 50, offset: number = 0): Promise<any> => {
      try {
        const response = await fetch(
          `/api/calling/history?action=history&limit=${limit}&offset=${offset}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error('통화 이력 조회 실패')
        }

        const data = await response.json()
        return data.data.calls

        console.info('통화 이력 조회됨', { count: data.data.calls.length })
      } catch (error) {
        console.error('통화 이력 조회 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        throw error
      }
    },
    [token]
  )

  /**
   * 통화 통계 조회
   */
  const getCallStatistics = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/calling/history?action=statistics', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('통화 통계 조회 실패')
      }

      const data = await response.json()
      setCallStats(data.data)

      console.info('통화 통계 조회됨')
    } catch (error) {
      console.error('통화 통계 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [token])

  /**
   * 진행 중인 통화 확인
   */
  const getActiveCall = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/calling/history?action=active', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('활성 통화 확인 실패')
      }

      const data = await response.json()
      if (data.data.activeCall) {
        setCurrentCall({
          ...data.data.activeCall,
          status: 'active' as const,
        })
      }

      console.info('활성 통화 확인됨')
    } catch (error) {
      console.error('활성 통화 확인 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [token])

  /**
   * 대기 중인 통화 확인
   */
  const getPendingCall = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/calling/history?action=pending', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('대기 중인 통화 확인 실패')
      }

      const data = await response.json()
      if (data.data.pendingCall) {
        setIncomingCall(data.data.pendingCall)
      }

      console.info('대기 중인 통화 확인됨')
    } catch (error) {
      console.error('대기 중인 통화 확인 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [token])

  /**
   * WebRTC Peer Connection 생성
   */
  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] },
        { urls: ['stun:stun1.l.google.com:19302'] },
      ],
    }

    const peerConnection = new RTCPeerConnection(configuration)

    // ICE 후보자 처리
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Socket.io를 통해 상대방에게 ICE 후보자 전송
        console.info('ICE 후보자 생성됨')
      }
    }

    // 원격 스트림 추가
    peerConnection.ontrack = (event) => {
      console.info('원격 미디어 스트림 수신')
    }

    peerConnectionRef.current = peerConnection
    return peerConnection
  }, [])

  /**
   * WebRTC Offer 생성
   */
  const createOffer = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
    const peerConnection =
      peerConnectionRef.current || createPeerConnection()

    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    return offer
  }, [createPeerConnection])

  /**
   * WebRTC Answer 생성
   */
  const createAnswer = useCallback(
    async (
      offer: RTCSessionDescription
    ): Promise<RTCSessionDescriptionInit> => {
      const peerConnection =
        peerConnectionRef.current || createPeerConnection()

      await peerConnection.setRemoteDescription(offer)
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)

      return answer
    },
    [createPeerConnection]
  )

  /**
   * 원격 Description 설정
   */
  const setRemoteDescription = useCallback(
    async (description: RTCSessionDescriptionInit): Promise<void> => {
      const peerConnection =
        peerConnectionRef.current || createPeerConnection()

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(description)
      )
    },
    [createPeerConnection]
  )

  /**
   * 로컬 미디어 스트림 획득
   */
  const getLocalStream = useCallback(
    async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        localStreamRef.current = stream

        // 피어 연결에 트랙 추가
        if (peerConnectionRef.current) {
          stream.getTracks().forEach((track) => {
            peerConnectionRef.current?.addTrack(track, stream)
          })
        }

        console.info('로컬 미디어 스트림 획득됨')
        return stream
      } catch (error) {
        console.error('로컬 미디어 스트림 획득 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        throw error
      }
    },
    []
  )

  /**
   * 로컬 미디어 스트림 정지
   */
  const stopLocalStream = useCallback((stream: MediaStream): void => {
    stream.getTracks().forEach((track) => {
      track.stop()
    })
    localStreamRef.current = null
  }, [])

  /**
   * 통화 상태 초기화
   */
  const clearCall = useCallback((): void => {
    setCurrentCall(null)
    setIncomingCall(null)
  }, [])

  const value: CallingContextType = {
    currentCall,
    incomingCall,
    callStats,
    isCallActive: currentCall?.status === 'active',
    loadingCall,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    addIceCandidate,
    getCallHistory,
    getCallStatistics,
    getActiveCall,
    getPendingCall,
    createPeerConnection,
    createOffer,
    createAnswer,
    setRemoteDescription,
    getLocalStream,
    stopLocalStream,
    clearCall,
  }

  return (
    <CallingContext.Provider value={value}>
      {children}
    </CallingContext.Provider>
  )
}

/**
 * 통화 시스템 Context 사용 Hook
 */
export function useCalling() {
  const context = useContext(CallingContext)

  if (!context) {
    throw new Error('useCalling must be used within CallingProvider')
  }

  return context
}
