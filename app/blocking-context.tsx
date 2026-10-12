'use client'

/**
 * 차단 시스템 Context
 * 클라이언트 측 차단 상태 관리
 */

import React, { createContext, useContext, useState, useCallback } from 'react'

interface BlockedUser {
  id: string
  username: string
  profileImage?: string
  reason?: string
  blockedAt: Date
}

interface Blocker {
  id: string
  username: string
  blockedAt: Date
}

interface BlockingContextType {
  blockedUsers: BlockedUser[]
  blockers: Blocker[]
  loadingBlocked: boolean
  loadingBlockers: boolean
  blockUser: (userId: string, reason?: string) => Promise<boolean>
  unblockUser: (userId: string) => Promise<boolean>
  getBlockedUsers: (limit?: number, offset?: number) => Promise<void>
  getBlockers: (limit?: number, offset?: number) => Promise<void>
  isBlockedByMe: (userId: string) => boolean
  isBlockingMe: (userId: string) => boolean
  canCommunicate: (userId: string) => boolean
}

const BlockingContext = createContext<BlockingContextType | undefined>(
  undefined
)

interface BlockingProviderProps {
  children: React.ReactNode
  token: string
}

/**
 * 차단 시스템 Context Provider
 */
export function BlockingProvider({ children, token }: BlockingProviderProps) {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [blockers, setBlockers] = useState<Blocker[]>([])
  const [loadingBlocked, setLoadingBlocked] = useState(false)
  const [loadingBlockers, setLoadingBlockers] = useState(false)

  /**
   * 사용자 차단
   */
  const blockUser = useCallback(
    async (userId: string, reason?: string): Promise<boolean> => {
      try {
        const response = await fetch('/api/blocking/block', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ blockedUserId: userId, reason }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '차단 실패')
        }

        const data = await response.json()

        // 로컬 상태 업데이트
        setBlockedUsers((prev) => [
          ...prev,
          {
            id: userId,
            username: '', // 추가 정보는 별도로 로드 필요
            reason,
            blockedAt: new Date(),
          },
        ])

        console.info('사용자 차단됨', { userId })
        return true
      } catch (error) {
        console.error('사용자 차단 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        return false
      }
    },
    [token]
  )

  /**
   * 사용자 차단 해제
   */
  const unblockUser = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        const response = await fetch('/api/blocking/block', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ blockedUserId: userId }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '차단 해제 실패')
        }

        // 로컬 상태 업데이트
        setBlockedUsers((prev) =>
          prev.filter((block) => block.id !== userId)
        )

        console.info('사용자 차단 해제됨', { userId })
        return true
      } catch (error) {
        console.error('사용자 차단 해제 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        return false
      }
    },
    [token]
  )

  /**
   * 내가 차단한 사용자 목록 로드
   */
  const getBlockedUsers = useCallback(
    async (limit: number = 50, offset: number = 0) => {
      setLoadingBlocked(true)
      try {
        const response = await fetch(
          `/api/blocking/blocked?type=blocked&limit=${limit}&offset=${offset}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error('차단된 사용자 목록 로드 실패')
        }

        const data = await response.json()
        setBlockedUsers(data.data)

        console.info('차단된 사용자 목록 로드됨', {
          count: data.data.length,
        })
      } catch (error) {
        console.error('차단된 사용자 목록 로드 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      } finally {
        setLoadingBlocked(false)
      }
    },
    [token]
  )

  /**
   * 나를 차단한 사용자 목록 로드
   */
  const getBlockers = useCallback(
    async (limit: number = 50, offset: number = 0) => {
      setLoadingBlockers(true)
      try {
        const response = await fetch(
          `/api/blocking/blocked?type=blockers&limit=${limit}&offset=${offset}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error('나를 차단한 사용자 목록 로드 실패')
        }

        const data = await response.json()
        setBlockers(data.data)

        console.info('나를 차단한 사용자 목록 로드됨', {
          count: data.data.length,
        })
      } catch (error) {
        console.error('나를 차단한 사용자 목록 로드 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      } finally {
        setLoadingBlockers(false)
      }
    },
    [token]
  )

  /**
   * 특정 사용자를 내가 차단했는지 확인
   */
  const isBlockedByMe = useCallback(
    (userId: string) => {
      return blockedUsers.some((block) => block.id === userId)
    },
    [blockedUsers]
  )

  /**
   * 특정 사용자가 나를 차단했는지 확인
   */
  const isBlockingMe = useCallback(
    (userId: string) => {
      return blockers.some((blocker) => blocker.id === userId)
    },
    [blockers]
  )

  /**
   * 해당 사용자와 통신 가능 여부
   */
  const canCommunicate = useCallback(
    (userId: string) => {
      return !isBlockedByMe(userId) && !isBlockingMe(userId)
    },
    [isBlockedByMe, isBlockingMe]
  )

  const value: BlockingContextType = {
    blockedUsers,
    blockers,
    loadingBlocked,
    loadingBlockers,
    blockUser,
    unblockUser,
    getBlockedUsers,
    getBlockers,
    isBlockedByMe,
    isBlockingMe,
    canCommunicate,
  }

  return (
    <BlockingContext.Provider value={value}>
      {children}
    </BlockingContext.Provider>
  )
}

/**
 * 차단 시스템 Context 사용 Hook
 */
export function useBlocking() {
  const context = useContext(BlockingContext)

  if (!context) {
    throw new Error('useBlocking must be used within BlockingProvider')
  }

  return context
}
