/**
 * 프리미엄 구독 시스템 단위 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getSubscriptionPlans,
  getUserSubscription,
  createSubscription,
  upgradeSubscription,
  cancelSubscription,
  getUserPlanType,
  getExpiringSubscriptions,
  getSubscriptionStatistics,
  type PlanType,
  type SubscriptionStatus,
} from '@/lib/subscription-system'
import {
  checkFeatureAccess,
  checkDailyLimit,
  checkMonthlyLimit,
  getProfileBoostLevel,
  getSearchFilterCount,
  getProfileViewLimit,
  shouldShowAds,
  hasPriorityMatching,
  isFeatureUnavailable,
} from '@/lib/feature-access'
import { db } from '@/lib/db'
import { logger } from '@/lib/logging'

// Mock dependencies
vi.mock('@/lib/db')
vi.mock('@/lib/logging')

describe('Subscription System - Plan Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should retrieve all subscription plans with correct structure', async () => {
    const plans = await getSubscriptionPlans()

    expect(plans).toHaveLength(5)
    expect(plans.map((p) => p.type)).toEqual([
      'free',
      'basic',
      'plus',
      'premium',
      'vip',
    ])
  })

  it('should have free plan with zero price', async () => {
    const plans = await getSubscriptionPlans()
    const freePlan = plans.find((p) => p.type === 'free')

    expect(freePlan).toBeDefined()
    expect(freePlan?.price).toBe(0)
    expect(freePlan?.duration).toBe(0)
  })

  it('should have plus plan with priority matching enabled', async () => {
    const plans = await getSubscriptionPlans()
    const plusPlan = plans.find((p) => p.type === 'plus')

    expect(plusPlan?.priorityMatching).toBe(true)
    expect(plusPlan?.adsFree).toBe(true)
    expect(plusPlan?.profileBoost).toBe(3)
  })

  it('should have vip plan with highest features', async () => {
    const plans = await getSubscriptionPlans()
    const vipPlan = plans.find((p) => p.type === 'vip')

    expect(vipPlan?.price).toBe(99900)
    expect(vipPlan?.monthlyLikes).toBe(5000)
    expect(vipPlan?.dailyMessages).toBe(1000)
    expect(vipPlan?.searchFilters).toBe(30)
    expect(vipPlan?.profileBoost).toBe(10)
  })

  it('should generate features for each plan', async () => {
    const plans = await getSubscriptionPlans()

    plans.forEach((plan) => {
      expect(plan.features).toBeDefined()
      expect(plan.features.length).toBeGreaterThan(0)
      expect(plan.features).toEqual(expect.arrayContaining([expect.any(String)]))
    })
  })

  it('should have incrementing search filter counts', async () => {
    const plans = await getSubscriptionPlans()
    const filterCounts = plans.map((p) => p.searchFilters)

    expect(filterCounts).toEqual([3, 6, 12, 20, 30])
  })

  it('should have incrementing profile view limits', async () => {
    const plans = await getSubscriptionPlans()
    const viewLimits = plans.map((p) => p.profileViews)

    expect(viewLimits).toEqual([10, 100, 500, 1000, 5000])
  })

  it('should have incrementing profile boost levels', async () => {
    const plans = await getSubscriptionPlans()
    const boostLevels = plans.map((p) => p.profileBoost)

    expect(boostLevels).toEqual([1, 1.5, 3, 5, 10])
  })
})

describe('Subscription System - User Subscription', () => {
  const mockUserId = 'user_123'
  const mockPlanId = 'plan_plus'
  const now = new Date()
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null for user without active subscription', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)

    const subscription = await getUserSubscription(mockUserId)

    expect(subscription).toBeNull()
  })

  it('should retrieve active user subscription', async () => {
    const mockSubscription = {
      id: 'sub_123',
      userId: mockUserId,
      planId: mockPlanId,
      status: 'active' as const,
      startDate: now,
      endDate,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      plan: {
        id: mockPlanId,
        name: 'plus',
        price: 19900,
        duration: 30,
        createdAt: now,
      },
    }

    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(
      mockSubscription as any
    )

    const subscription = await getUserSubscription(mockUserId)

    expect(subscription).toBeDefined()
    expect(subscription?.planType).toBe('plus')
    expect(subscription?.status).toBe('active')
  })

  it('should mark expired subscription and return null', async () => {
    const expiredDate = new Date(now.getTime() - 1000) // 1 second ago

    const mockSubscription = {
      id: 'sub_123',
      userId: mockUserId,
      planId: mockPlanId,
      status: 'active' as const,
      startDate: now,
      endDate: expiredDate,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      plan: {
        id: mockPlanId,
        name: 'plus',
        price: 19900,
        duration: 30,
        createdAt: now,
      },
    }

    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(
      mockSubscription as any
    )
    vi.mocked(db.subscription.update).mockResolvedValueOnce({
      ...mockSubscription,
      status: 'expired',
    } as any)

    const subscription = await getUserSubscription(mockUserId)

    expect(subscription).toBeNull()
    expect(db.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_123' },
      data: { status: 'expired' },
    })
  })

  it('should return free plan for user without subscription', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)

    const planType = await getUserPlanType(mockUserId)

    expect(planType).toBe('free')
  })

  it('should return user plan type from active subscription', async () => {
    const mockSubscription = {
      id: 'sub_123',
      userId: mockUserId,
      planId: mockPlanId,
      status: 'active' as const,
      startDate: now,
      endDate,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      plan: {
        id: mockPlanId,
        name: 'premium',
        price: 39900,
        duration: 30,
        createdAt: now,
      },
    }

    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(
      mockSubscription as any
    )

    const planType = await getUserPlanType(mockUserId)

    expect(planType).toBe('premium')
  })
})

describe('Subscription System - Create Subscription', () => {
  const mockUserId = 'user_123'
  const mockTransactionId = 'txn_123456'
  const now = new Date()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create new subscription for free user', async () => {
    const mockPlan = {
      id: 'plan_plus',
      name: 'plus',
      price: 19900,
      duration: 30,
      createdAt: now,
    }

    const mockCreatedSubscription = {
      id: 'sub_new_123',
      userId: mockUserId,
      planId: mockPlan.id,
      status: 'active' as const,
      startDate: now,
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
    }

    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)
    vi.mocked(db.subscriptionPlan.findFirst).mockResolvedValueOnce(
      mockPlan as any
    )
    vi.mocked(db.subscription.create).mockResolvedValueOnce(
      mockCreatedSubscription as any
    )
    vi.mocked(db.payment.create).mockResolvedValueOnce({} as any)

    const result = await createSubscription(mockUserId, 'plus', mockTransactionId)

    expect(result.subscriptionId).toBe('sub_new_123')
    expect(result.planType).toBe('plus')
    expect(result.status).toBe('active')
    expect(db.payment.create).toHaveBeenCalled()
  })

  it('should cancel existing active subscriptions before creating new one', async () => {
    const mockPlan = {
      id: 'plan_plus',
      name: 'plus',
      price: 19900,
      duration: 30,
      createdAt: now,
    }

    const mockNewSubscription = {
      id: 'sub_new_123',
      userId: mockUserId,
      planId: mockPlan.id,
      status: 'active' as const,
      startDate: now,
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
    }

    vi.mocked(db.subscription.updateMany).mockResolvedValueOnce({
      count: 1,
    } as any)
    vi.mocked(db.subscriptionPlan.findFirst).mockResolvedValueOnce(
      mockPlan as any
    )
    vi.mocked(db.subscription.create).mockResolvedValueOnce(
      mockNewSubscription as any
    )
    vi.mocked(db.payment.create).mockResolvedValueOnce({} as any)

    await createSubscription(mockUserId, 'plus', mockTransactionId)

    expect(db.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: mockUserId,
          status: { in: ['active', 'suspended'] },
        }),
      })
    )
  })

  it('should record payment for subscription', async () => {
    const mockPlan = {
      id: 'plan_premium',
      name: 'premium',
      price: 39900,
      duration: 30,
      createdAt: now,
    }

    const mockNewSubscription = {
      id: 'sub_new_456',
      userId: mockUserId,
      planId: mockPlan.id,
      status: 'active' as const,
      startDate: now,
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
    }

    vi.mocked(db.subscription.updateMany).mockResolvedValueOnce({
      count: 0,
    } as any)
    vi.mocked(db.subscriptionPlan.findFirst).mockResolvedValueOnce(
      mockPlan as any
    )
    vi.mocked(db.subscription.create).mockResolvedValueOnce(
      mockNewSubscription as any
    )
    vi.mocked(db.payment.create).mockResolvedValueOnce({} as any)

    await createSubscription(mockUserId, 'premium', mockTransactionId)

    expect(db.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: mockUserId,
          amount: mockPlan.price,
          currency: 'KRW',
          status: 'completed',
          transactionId: mockTransactionId,
          reason: 'subscription',
        }),
      })
    )
  })

  it('should throw error if plan not found', async () => {
    vi.mocked(db.subscription.updateMany).mockResolvedValueOnce({
      count: 0,
    } as any)
    vi.mocked(db.subscriptionPlan.findFirst).mockResolvedValueOnce(null)

    await expect(
      createSubscription(mockUserId, 'plus', mockTransactionId)
    ).rejects.toThrow('플랜을 찾을 수 없습니다')
  })
})

describe('Subscription System - Upgrade Subscription', () => {
  const mockUserId = 'user_123'
  const mockTransactionId = 'txn_upgrade_123'
  const now = new Date()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should upgrade from basic to plus plan', async () => {
    const mockCurrentSubscription = {
      id: 'sub_basic_123',
      userId: mockUserId,
      planId: 'plan_basic',
      status: 'active' as const,
      startDate: now,
      endDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      plan: {
        id: 'plan_basic',
        name: 'basic',
        price: 9900,
        duration: 30,
        createdAt: now,
      },
    }

    const mockNewPlan = {
      id: 'plan_plus',
      name: 'plus',
      price: 19900,
      duration: 30,
      createdAt: now,
    }

    const mockNewSubscription = {
      id: 'sub_plus_456',
      userId: mockUserId,
      planId: mockNewPlan.id,
      status: 'active' as const,
      startDate: now,
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
    }

    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(
      mockCurrentSubscription as any
    )
    vi.mocked(db.subscription.update).mockResolvedValueOnce({
      ...mockCurrentSubscription,
      status: 'cancelled',
    } as any)
    vi.mocked(db.subscriptionPlan.findFirst).mockResolvedValueOnce(
      mockNewPlan as any
    )
    vi.mocked(db.subscription.updateMany).mockResolvedValueOnce({
      count: 1,
    } as any)
    vi.mocked(db.subscription.create).mockResolvedValueOnce(
      mockNewSubscription as any
    )
    vi.mocked(db.payment.create).mockResolvedValueOnce({} as any)

    const result = await upgradeSubscription(
      mockUserId,
      'plus',
      mockTransactionId
    )

    expect(result.planType).toBe('plus')
    expect(result.status).toBe('active')
  })

  it('should throw error if no active subscription to upgrade', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)

    await expect(
      upgradeSubscription(mockUserId, 'premium', mockTransactionId)
    ).rejects.toThrow('활성 구독이 없습니다')
  })

  it('should cancel old subscription before creating new one', async () => {
    const mockCurrentSubscription = {
      id: 'sub_basic_123',
      userId: mockUserId,
      planId: 'plan_basic',
      status: 'active' as const,
      startDate: now,
      endDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      plan: {
        id: 'plan_basic',
        name: 'basic',
        price: 9900,
        duration: 30,
        createdAt: now,
      },
    }

    const mockNewPlan = {
      id: 'plan_premium',
      name: 'premium',
      price: 39900,
      duration: 30,
      createdAt: now,
    }

    const mockNewSubscription = {
      id: 'sub_premium_456',
      userId: mockUserId,
      planId: mockNewPlan.id,
      status: 'active' as const,
      startDate: now,
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
    }

    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(
      mockCurrentSubscription as any
    )
    vi.mocked(db.subscription.update).mockResolvedValueOnce({
      ...mockCurrentSubscription,
      status: 'cancelled',
    } as any)
    vi.mocked(db.subscriptionPlan.findFirst).mockResolvedValueOnce(
      mockNewPlan as any
    )
    vi.mocked(db.subscription.updateMany).mockResolvedValueOnce({
      count: 1,
    } as any)
    vi.mocked(db.subscription.create).mockResolvedValueOnce(
      mockNewSubscription as any
    )
    vi.mocked(db.payment.create).mockResolvedValueOnce({} as any)

    await upgradeSubscription(mockUserId, 'premium', mockTransactionId)

    expect(db.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub_basic_123' },
        data: expect.objectContaining({
          status: 'cancelled',
        }),
      })
    )
  })
})

describe('Subscription System - Cancel Subscription', () => {
  const mockUserId = 'user_123'
  const now = new Date()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should cancel active subscription', async () => {
    const mockSubscription = {
      id: 'sub_123',
      userId: mockUserId,
      planId: 'plan_plus',
      status: 'active' as const,
      startDate: now,
      endDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      plan: {
        id: 'plan_plus',
        name: 'plus',
        price: 19900,
        duration: 30,
        createdAt: now,
      },
    }

    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(
      mockSubscription as any
    )
    vi.mocked(db.subscription.update).mockResolvedValueOnce({
      ...mockSubscription,
      status: 'cancelled',
    } as any)

    const result = await cancelSubscription(mockUserId)

    expect(result).toBe(true)
    expect(db.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_123' },
      data: expect.objectContaining({
        status: 'cancelled',
      }),
    })
  })

  it('should return false if no active subscription', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)

    const result = await cancelSubscription(mockUserId)

    expect(result).toBe(false)
  })
})

describe('Subscription System - Feature Access', () => {
  const mockUserId = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow free user access to basic features', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)

    const hasAccess = await checkFeatureAccess(mockUserId, 'profile_view')

    expect(hasAccess).toBe(true)
  })

  it('should deny free user access to priority matching', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)

    const hasAccess = await checkFeatureAccess(mockUserId, 'priority_matching')

    expect(hasAccess).toBe(false)
  })

  it('should allow plus user access to premium features', async () => {
    const mockSubscription = {
      id: 'sub_123',
      userId: mockUserId,
      planId: 'plan_plus',
      status: 'active' as const,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      cancelledAt: null,
      plan: {
        id: 'plan_plus',
        name: 'plus',
        price: 19900,
        duration: 30,
        createdAt: new Date(),
      },
    }

    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(
      mockSubscription as any
    )

    const hasAccess = await checkFeatureAccess(mockUserId, 'priority_matching')

    expect(hasAccess).toBe(true)
  })

  it('should deny vip user nothing', async () => {
    const mockSubscription = {
      id: 'sub_123',
      userId: mockUserId,
      planId: 'plan_vip',
      status: 'active' as const,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      cancelledAt: null,
      plan: {
        id: 'plan_vip',
        name: 'vip',
        price: 99900,
        duration: 30,
        createdAt: new Date(),
      },
    }

    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(
      mockSubscription as any
    )

    const vipFeatures = [
      'unlimited_rewind',
      'dedicated_manager',
      'priority_support',
      'unlimited_features',
    ]

    for (const feature of vipFeatures) {
      const hasAccess = await checkFeatureAccess(mockUserId, feature)
      expect(hasAccess).toBe(true)
    }
  })
})

describe('Subscription System - Daily Limits', () => {
  const mockUserId = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should enforce 5 message daily limit for free users', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)
    vi.mocked(db.message.count).mockResolvedValueOnce(5)

    const limit = await checkDailyLimit(mockUserId, 'messages')

    expect(limit.allowed).toBe(false)
    expect(limit.remaining).toBe(0)
    expect(limit.limit).toBe(5)
  })

  it('should allow messages when under limit', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)
    vi.mocked(db.message.count).mockResolvedValueOnce(3)

    const limit = await checkDailyLimit(mockUserId, 'messages')

    expect(limit.allowed).toBe(true)
    expect(limit.remaining).toBe(2)
  })

  it('should track likes limit separately', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)
    vi.mocked(db.like.count).mockResolvedValueOnce(10)

    const limit = await checkDailyLimit(mockUserId, 'likes')

    expect(limit.allowed).toBe(true) // Free plan has 10 daily likes
    expect(limit.remaining).toBe(0)
    expect(limit.limit).toBe(10)
  })

  it('should reset time be tomorrow at midnight', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)
    vi.mocked(db.message.count).mockResolvedValueOnce(0)

    const limit = await checkDailyLimit(mockUserId, 'messages')

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    expect(limit.resetTime.toDateString()).toBe(tomorrow.toDateString())
  })
})

describe('Subscription System - Monthly Limits', () => {
  const mockUserId = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should enforce 30 likes monthly limit for free users', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)
    vi.mocked(db.like.count).mockResolvedValueOnce(30)

    const limit = await checkMonthlyLimit(mockUserId, 'likes')

    expect(limit.allowed).toBe(false)
    expect(limit.remaining).toBe(0)
    expect(limit.limit).toBe(30)
  })

  it('should allow likes when under monthly limit', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)
    vi.mocked(db.like.count).mockResolvedValueOnce(20)

    const limit = await checkMonthlyLimit(mockUserId, 'likes')

    expect(limit.allowed).toBe(true)
    expect(limit.remaining).toBe(10)
  })

  it('should enforce 0 rewind limit for free users', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)

    const limit = await checkMonthlyLimit(mockUserId, 'rewinds')

    expect(limit.allowed).toBe(false)
    expect(limit.limit).toBe(0)
  })

  it('should reset time be next month first day', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)
    vi.mocked(db.like.count).mockResolvedValueOnce(0)

    const limit = await checkMonthlyLimit(mockUserId, 'likes')

    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(1)
    nextMonth.setHours(0, 0, 0, 0)

    expect(limit.resetTime.toDateString()).toBe(nextMonth.toDateString())
  })
})

describe('Subscription System - Helper Functions', () => {
  const mockUserId = 'user_123'
  const mockSubscription = {
    id: 'sub_123',
    userId: mockUserId,
    planId: 'plan_premium',
    status: 'active' as const,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    cancelledAt: null,
    plan: {
      id: 'plan_premium',
      name: 'premium',
      price: 39900,
      duration: 30,
      createdAt: new Date(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return correct profile boost level by plan', async () => {
    const freeBoost = await getProfileBoostLevel('free_user')
    const plusBoost = await getProfileBoostLevel('plus_user')
    const vipBoost = await getProfileBoostLevel('vip_user')

    expect(freeBoost).toBeGreaterThan(0)
    expect(plusBoost).toBeGreaterThan(freeBoost)
    expect(vipBoost).toBeGreaterThan(plusBoost)
  })

  it('should return correct search filter count by plan', async () => {
    const freeFilters = await getSearchFilterCount('free_user')
    const basicFilters = await getSearchFilterCount('basic_user')
    const vipFilters = await getSearchFilterCount('vip_user')

    expect(freeFilters).toBeLessThan(basicFilters)
    expect(basicFilters).toBeLessThan(vipFilters)
  })

  it('should return correct profile view limit by plan', async () => {
    const freeLimit = await getProfileViewLimit('free_user')
    const premiumLimit = await getProfileViewLimit('premium_user')
    const vipLimit = await getProfileViewLimit('vip_user')

    expect(freeLimit).toBeLessThan(premiumLimit)
    expect(premiumLimit).toBeLessThan(vipLimit)
  })

  it('should show ads for free users', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)

    const shouldShow = await shouldShowAds(mockUserId)

    expect(shouldShow).toBe(true)
  })

  it('should not show ads for plus+ users', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(
      mockSubscription as any
    )

    const shouldShow = await shouldShowAds(mockUserId)

    expect(shouldShow).toBe(false)
  })

  it('should have priority matching for plus+ users', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(
      mockSubscription as any
    )

    const hasPriority = await hasPriorityMatching(mockUserId)

    expect(hasPriority).toBe(true)
  })

  it('should not have priority matching for free users', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)

    const hasPriority = await hasPriorityMatching(mockUserId)

    expect(hasPriority).toBe(false)
  })
})

describe('Subscription System - Feature Unavailability', () => {
  const mockUserId = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should indicate feature available for free users', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)

    const result = await isFeatureUnavailable(mockUserId, 'profile_view')

    expect(result.unavailable).toBe(false)
    expect(result.requiredPlan).toBeNull()
  })

  it('should indicate priority matching requires plus plan', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)

    const result = await isFeatureUnavailable(mockUserId, 'priority_matching')

    expect(result.unavailable).toBe(true)
    expect(result.requiredPlan).toBe('plus')
    expect(result.reason).toContain('plus')
  })

  it('should indicate verified badge requires premium plan', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)

    const result = await isFeatureUnavailable(mockUserId, 'verified_badge')

    expect(result.unavailable).toBe(true)
    expect(result.requiredPlan).toBe('premium')
  })

  it('should indicate dedicated manager requires vip plan', async () => {
    vi.mocked(db.subscription.findFirst).mockResolvedValueOnce(null)

    const result = await isFeatureUnavailable(mockUserId, 'dedicated_manager')

    expect(result.unavailable).toBe(true)
    expect(result.requiredPlan).toBe('vip')
  })
})

describe('Subscription System - Expiring Subscriptions', () => {
  const mockUserId = 'user_123'
  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should retrieve subscriptions expiring within 7 days', async () => {
    const mockExpiringSubscriptions = [
      {
        id: 'sub_exp_1',
        userId: mockUserId,
        planId: 'plan_plus',
        status: 'active' as const,
        startDate: new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000),
        endDate: threeDaysFromNow,
        createdAt: now,
        updatedAt: now,
        cancelledAt: null,
        user: {
          id: mockUserId,
          email: 'user@example.com',
        },
        plan: {
          id: 'plan_plus',
          name: 'plus',
          price: 19900,
          duration: 30,
          createdAt: now,
        },
      },
    ]

    vi.mocked(db.subscription.findMany).mockResolvedValueOnce(
      mockExpiringSubscriptions as any
    )

    const expiringSubscriptions = await getExpiringSubscriptions(7)

    expect(expiringSubscriptions).toHaveLength(1)
    expect(expiringSubscriptions[0].planType).toBe('plus')
    expect(expiringSubscriptions[0].userEmail).toBe('user@example.com')
  })

  it('should return empty array if no subscriptions expiring', async () => {
    vi.mocked(db.subscription.findMany).mockResolvedValueOnce([])

    const expiringSubscriptions = await getExpiringSubscriptions(7)

    expect(expiringSubscriptions).toHaveLength(0)
  })
})

describe('Subscription System - Statistics', () => {
  const now = new Date()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate subscription statistics', async () => {
    const mockSubscriptions = [
      {
        id: 'sub_1',
        userId: 'user_1',
        planId: 'plan_plus',
        status: 'active' as const,
        startDate: now,
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        createdAt: now,
        updatedAt: now,
        cancelledAt: null,
        plan: {
          id: 'plan_plus',
          name: 'plus',
          price: 19900,
          duration: 30,
          createdAt: now,
        },
      },
      {
        id: 'sub_2',
        userId: 'user_2',
        planId: 'plan_premium',
        status: 'active' as const,
        startDate: now,
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        createdAt: now,
        updatedAt: now,
        cancelledAt: null,
        plan: {
          id: 'plan_premium',
          name: 'premium',
          price: 39900,
          duration: 30,
          createdAt: now,
        },
      },
      {
        id: 'sub_3',
        userId: 'user_3',
        planId: 'plan_basic',
        status: 'cancelled' as const,
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: now,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: now,
        cancelledAt: now,
        plan: {
          id: 'plan_basic',
          name: 'basic',
          price: 9900,
          duration: 30,
          createdAt: now,
        },
      },
    ]

    vi.mocked(db.subscription.findMany).mockResolvedValueOnce(
      mockSubscriptions as any
    )

    const stats = await getSubscriptionStatistics()

    expect(stats.totalSubscribers).toBe(3)
    expect(stats.activeSubscriptions).toBe(2)
    expect(stats.subscriptionByPlan.plus).toBe(1)
    expect(stats.subscriptionByPlan.premium).toBe(1)
    expect(stats.subscriptionByPlan.basic).toBe(1)
    expect(stats.mrr).toBe(19900 + 39900) // Active subscriptions only
    expect(stats.arr).toBe(stats.mrr * 12)
    expect(stats.churnRate).toBeCloseTo(33.33, 1) // 1/3 cancelled
  })

  it('should handle empty subscription list', async () => {
    vi.mocked(db.subscription.findMany).mockResolvedValueOnce([])

    const stats = await getSubscriptionStatistics()

    expect(stats.totalSubscribers).toBe(0)
    expect(stats.activeSubscriptions).toBe(0)
    expect(stats.mrr).toBe(0)
    expect(stats.arr).toBe(0)
    expect(stats.churnRate).toBe(0)
  })
})

describe('Subscription System - Error Handling', () => {
  const mockUserId = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle database errors gracefully in getUserSubscription', async () => {
    vi.mocked(db.subscription.findFirst).mockRejectedValueOnce(
      new Error('Database connection failed')
    )

    const subscription = await getUserSubscription(mockUserId)

    expect(subscription).toBeNull()
    expect(logger.error).toHaveBeenCalled()
  })

  it('should handle database errors gracefully in checkFeatureAccess', async () => {
    vi.mocked(db.subscription.findFirst).mockRejectedValueOnce(
      new Error('Database error')
    )

    const hasAccess = await checkFeatureAccess(mockUserId, 'profile_view')

    expect(hasAccess).toBe(false)
    expect(logger.error).toHaveBeenCalled()
  })

  it('should return safe defaults when daily limit check fails', async () => {
    vi.mocked(db.subscription.findFirst).mockRejectedValueOnce(
      new Error('Database error')
    )

    const limit = await checkDailyLimit(mockUserId, 'messages')

    expect(limit.allowed).toBe(true)
    expect(limit.remaining).toBe(1)
    expect(limit.limit).toBe(1)
  })

  it('should return profile boost of 1 on error', async () => {
    const boost = await getProfileBoostLevel('invalid_user')

    expect(boost).toBeGreaterThanOrEqual(1)
  })
})
