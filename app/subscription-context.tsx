'use client'

/**
 * 구독 시스템 Context
 * 클라이언트 측 구독 상태 관리
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react'

interface SubscriptionPlan {
  id: string
  type: string
  name: string
  price: number
  duration: number
  features: string[]
  monthlyLikes: number
  dailyMessages: number
  searchFilters: number
  profileViews: number
  priorityMatching: boolean
  adsFree: boolean
  profileBoost: number
  rewindCount: number
}

interface UserSubscription {
  id: string
  planType: string
  status: 'active' | 'cancelled' | 'expired' | 'suspended'
  startDate: Date
  endDate: Date
  autoRenew: boolean
}

interface FeatureLimitInfo {
  allowed: boolean
  remaining: number
  limit: number
  resetTime: Date
}

interface SubscriptionContextType {
  // 상태
  plans: SubscriptionPlan[]
  currentSubscription: UserSubscription | null
  planType: string
  loadingPlans: boolean
  loadingSubscription: boolean

  // 플랜 관리
  getPlans: () => Promise<void>
  subscribe: (planType: string) => Promise<void>
  upgrade: (planType: string) => Promise<void>
  cancelSubscription: () => Promise<void>
  getSubscriptionStatus: () => Promise<void>

  // 기능 접근
  checkFeatureAccess: (feature: string) => Promise<boolean>
  checkDailyLimit: (action: string) => Promise<FeatureLimitInfo>
  checkMonthlyLimit: (action: string) => Promise<FeatureLimitInfo>
  checkFeatureAvailability: (feature: string) => Promise<{
    unavailable: boolean
    requiredPlan: string | null
    reason: string
  }>

  // 헬퍼
  isPremium: boolean
  isVIP: boolean
  canAccess: (feature: string) => Promise<boolean>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
)

interface SubscriptionProviderProps {
  children: React.ReactNode
  token: string
}

/**
 * 구독 시스템 Context Provider
 */
export function SubscriptionProvider({
  children,
  token,
}: SubscriptionProviderProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [currentSubscription, setCurrentSubscription] =
    useState<UserSubscription | null>(null)
  const [planType, setPlanType] = useState<string>('free')
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [loadingSubscription, setLoadingSubscription] = useState(false)

  /**
   * 플랜 목록 조회
   */
  const getPlans = useCallback(async (): Promise<void> => {
    setLoadingPlans(true)
    try {
      const response = await fetch('/api/subscription/plans')

      if (!response.ok) {
        throw new Error('플랜 조회 실패')
      }

      const data = await response.json()
      setPlans(data.data.plans)

      console.info('구독 플랜 조회됨', { count: data.data.plans.length })
    } catch (error) {
      console.error('플랜 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoadingPlans(false)
    }
  }, [])

  /**
   * 구독 상태 조회
   */
  const getSubscriptionStatus = useCallback(async (): Promise<void> => {
    setLoadingSubscription(true)
    try {
      const response = await fetch('/api/subscription/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('구독 상태 조회 실패')
      }

      const data = await response.json()
      setPlanType(data.data.planType)

      if (data.data.subscription) {
        setCurrentSubscription({
          ...data.data.subscription,
          startDate: new Date(data.data.subscription.startDate),
          endDate: new Date(data.data.subscription.endDate),
        })
      } else {
        setCurrentSubscription(null)
      }

      console.info('구독 상태 조회됨', { planType: data.data.planType })
    } catch (error) {
      console.error('구독 상태 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoadingSubscription(false)
    }
  }, [token])

  /**
   * 구독 시작
   */
  const subscribe = useCallback(
    async (newPlanType: string): Promise<void> => {
      setLoadingSubscription(true)
      try {
        const response = await fetch('/api/subscription/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            planType: newPlanType,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '구독 생성 실패')
        }

        await getSubscriptionStatus()

        console.info('구독 생성됨', { planType: newPlanType })
      } catch (error) {
        console.error('구독 생성 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        throw error
      } finally {
        setLoadingSubscription(false)
      }
    },
    [token, getSubscriptionStatus]
  )

  /**
   * 구독 업그레이드/다운그레이드
   */
  const upgrade = useCallback(
    async (newPlanType: string): Promise<void> => {
      setLoadingSubscription(true)
      try {
        const response = await fetch('/api/subscription/upgrade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            newPlanType,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '구독 변경 실패')
        }

        await getSubscriptionStatus()

        console.info('구독 업그레이드됨', { newPlanType })
      } catch (error) {
        console.error('구독 업그레이드 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        throw error
      } finally {
        setLoadingSubscription(false)
      }
    },
    [token, getSubscriptionStatus]
  )

  /**
   * 구독 취소
   */
  const cancelSubscription = useCallback(async (): Promise<void> => {
    setLoadingSubscription(true)
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '구독 취소 실패')
      }

      await getSubscriptionStatus()

      console.info('구독 취소됨')
    } catch (error) {
      console.error('구독 취소 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    } finally {
      setLoadingSubscription(false)
    }
  }, [token, getSubscriptionStatus])

  /**
   * 기능 접근 확인
   */
  const checkFeatureAccess = useCallback(
    async (feature: string): Promise<boolean> => {
      try {
        const response = await fetch(
          `/api/subscription/check-feature?feature=${feature}&type=access`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          return false
        }

        const data = await response.json()
        return data.data.hasAccess
      } catch (error) {
        console.error('기능 접근 확인 실패', {
          feature,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        return false
      }
    },
    [token]
  )

  /**
   * 일일 한도 확인
   */
  const checkDailyLimit = useCallback(
    async (action: string): Promise<FeatureLimitInfo> => {
      try {
        const response = await fetch(
          `/api/subscription/check-feature?feature=${action}&type=daily`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          return {
            allowed: true,
            remaining: 1,
            limit: 1,
            resetTime: new Date(),
          }
        }

        const data = await response.json()
        return {
          ...data.data,
          resetTime: new Date(data.data.resetTime),
        }
      } catch (error) {
        console.error('일일 한도 확인 실패', {
          action,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        return {
          allowed: true,
          remaining: 1,
          limit: 1,
          resetTime: new Date(),
        }
      }
    },
    [token]
  )

  /**
   * 월간 한도 확인
   */
  const checkMonthlyLimit = useCallback(
    async (action: string): Promise<FeatureLimitInfo> => {
      try {
        const response = await fetch(
          `/api/subscription/check-feature?feature=${action}&type=monthly`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          return {
            allowed: true,
            remaining: 1,
            limit: 1,
            resetTime: new Date(),
          }
        }

        const data = await response.json()
        return {
          ...data.data,
          resetTime: new Date(data.data.resetTime),
        }
      } catch (error) {
        console.error('월간 한도 확인 실패', {
          action,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        return {
          allowed: true,
          remaining: 1,
          limit: 1,
          resetTime: new Date(),
        }
      }
    },
    [token]
  )

  /**
   * 기능 가용성 확인
   */
  const checkFeatureAvailability = useCallback(
    async (feature: string) => {
      try {
        const response = await fetch(
          `/api/subscription/check-feature?feature=${feature}&type=availability`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          return {
            unavailable: true,
            requiredPlan: null,
            reason: '기능 확인 중 오류가 발생했습니다',
          }
        }

        const data = await response.json()
        return data.data
      } catch (error) {
        console.error('기능 가용성 확인 실패', {
          feature,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        return {
          unavailable: true,
          requiredPlan: null,
          reason: '기능 확인 중 오류가 발생했습니다',
        }
      }
    },
    [token]
  )

  /**
   * 기능 접근 헬퍼
   */
  const canAccess = useCallback(
    async (feature: string): Promise<boolean> => {
      return await checkFeatureAccess(feature)
    },
    [checkFeatureAccess]
  )

  // 초기 로드
  useEffect(() => {
    getPlans()
    getSubscriptionStatus()
  }, [token, getPlans, getSubscriptionStatus])

  const value: SubscriptionContextType = {
    plans,
    currentSubscription,
    planType,
    loadingPlans,
    loadingSubscription,
    getPlans,
    subscribe,
    upgrade,
    cancelSubscription,
    getSubscriptionStatus,
    checkFeatureAccess,
    checkDailyLimit,
    checkMonthlyLimit,
    checkFeatureAvailability,
    isPremium: ['plus', 'premium', 'vip'].includes(planType),
    isVIP: planType === 'vip',
    canAccess,
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

/**
 * 구독 시스템 Context 사용 Hook
 */
export function useSubscription() {
  const context = useContext(SubscriptionContext)

  if (!context) {
    throw new Error(
      'useSubscription must be used within SubscriptionProvider'
    )
  }

  return context
}
