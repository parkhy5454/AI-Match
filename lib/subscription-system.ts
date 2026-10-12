/**
 * 프리미엄 구독 시스템
 * 멤버십 관리 및 기능 접근 제어
 */

import { db } from './db'
import { logger } from './logging'

/**
 * 구독 플랜 타입
 */
export type PlanType = 'free' | 'basic' | 'plus' | 'premium' | 'vip'

/**
 * 구독 상태
 */
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'suspended'

/**
 * 구독 플랜 인터페이스
 */
export interface SubscriptionPlan {
  id: string
  type: PlanType
  name: string
  price: number // 월간 가격 (원)
  duration: number // 기본 구독 기간 (일)
  features: string[] // 포함된 기능 리스트
  monthlyLikes: number // 월간 좋아요 수
  dailyMessages: number // 일일 메시지 한도
  searchFilters: number // 검색 필터 개수
  profileViews: number // 프로필 조회 수
  priorityMatching: boolean // 우선 매칭
  adsFree: boolean // 광고 제거
  profileBoost: number // 프로필 노출 배수
  rewindCount: number // 실행 취소 기능
  createdAt: Date
}

/**
 * 사용자 구독 정보
 */
export interface UserSubscription {
  id: string
  userId: string
  planType: PlanType
  status: SubscriptionStatus
  startDate: Date
  endDate: Date
  autoRenew: boolean
  nextPaymentDate: Date | null
  paymentMethod?: 'card' | 'paypal' | 'bank_transfer'
  createdAt: Date
  updatedAt: Date
}

/**
 * 구독 플랜 조회
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const plans = await db.subscriptionPlan.findMany({
      orderBy: { price: 'asc' },
    })

    // 기본 플랜들 (DB에 없으면 하드코딩)
    const defaultPlans: Record<string, Partial<SubscriptionPlan>> = {
      free: {
        type: 'free',
        name: '프리',
        price: 0,
        duration: 0,
        monthlyLikes: 10,
        dailyMessages: 5,
        searchFilters: 3,
        profileViews: 10,
        priorityMatching: false,
        adsFree: false,
        profileBoost: 1,
        rewindCount: 0,
      },
      basic: {
        type: 'basic',
        name: '베이직',
        price: 9900,
        duration: 30,
        monthlyLikes: 100,
        dailyMessages: 50,
        searchFilters: 6,
        profileViews: 100,
        priorityMatching: false,
        adsFree: false,
        profileBoost: 1.5,
        rewindCount: 5,
      },
      plus: {
        type: 'plus',
        name: '플러스',
        price: 19900,
        duration: 30,
        monthlyLikes: 500,
        dailyMessages: 200,
        searchFilters: 12,
        profileViews: 500,
        priorityMatching: true,
        adsFree: true,
        profileBoost: 3,
        rewindCount: 20,
      },
      premium: {
        type: 'premium',
        name: '프리미엄',
        price: 39900,
        duration: 30,
        monthlyLikes: 1000,
        dailyMessages: 500,
        searchFilters: 20,
        profileViews: 1000,
        priorityMatching: true,
        adsFree: true,
        profileBoost: 5,
        rewindCount: 50,
      },
      vip: {
        type: 'vip',
        name: 'VIP',
        price: 99900,
        duration: 30,
        monthlyLikes: 5000,
        dailyMessages: 1000,
        searchFilters: 30,
        profileViews: 5000,
        priorityMatching: true,
        adsFree: true,
        profileBoost: 10,
        rewindCount: 1000,
      },
    }

    // DB의 플랜들을 기본값과 병합
    const merged: SubscriptionPlan[] = Object.values(
      defaultPlans
    ).map((plan) => ({
      id: `plan_${plan.type}`,
      type: plan.type as PlanType,
      name: plan.name!,
      price: plan.price || 0,
      duration: plan.duration!,
      features: generateFeatures(plan.type as PlanType),
      monthlyLikes: plan.monthlyLikes!,
      dailyMessages: plan.dailyMessages!,
      searchFilters: plan.searchFilters!,
      profileViews: plan.profileViews!,
      priorityMatching: plan.priorityMatching!,
      adsFree: plan.adsFree!,
      profileBoost: plan.profileBoost!,
      rewindCount: plan.rewindCount!,
      createdAt: new Date(),
    }))

    logger.info('구독 플랜 조회', { count: merged.length })

    return merged
  } catch (error) {
    logger.error('구독 플랜 조회 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 플랜별 기능 리스트 생성
 */
function generateFeatures(planType: PlanType): string[] {
  const baseFeatures: Record<PlanType, string[]> = {
    free: [
      '기본 프로필',
      '월 10회 좋아요',
      '일일 5개 메시지',
      '제한된 검색',
    ],
    basic: [
      '확장 프로필',
      '월 100회 좋아요',
      '일일 50개 메시지',
      '6가지 검색 필터',
      '프로필 재실행 5회',
    ],
    plus: [
      '프리미엄 프로필',
      '월 500회 좋아요',
      '일일 200개 메시지',
      '12가지 검색 필터',
      '우선 매칭',
      '광고 제거',
      '프로필 부스트 3배',
      '프로필 재실행 20회',
    ],
    premium: [
      'VIP 프로필',
      '월 1000회 좋아요',
      '일일 500개 메시지',
      '모든 검색 필터',
      '최고 우선 매칭',
      '광고 완전 제거',
      '프로필 부스트 5배',
      '프로필 재실행 50회',
      '프로필 검증 배지',
    ],
    vip: [
      'VIP 얼터에고',
      '무제한 좋아요',
      '무제한 메시지',
      '커스텀 검색',
      '절대 우선 매칭',
      '광고 완전 제거',
      '프로필 부스트 10배',
      '무제한 프로필 재실행',
      'VIP 배지',
      '전담 매칭 매니저',
      '우선 고객 지원',
    ],
  }

  return baseFeatures[planType] || []
}

/**
 * 사용자 구독 상태 조회
 */
export async function getUserSubscription(
  userId: string
): Promise<UserSubscription | null> {
  try {
    const subscription = await db.subscription.findFirst({
      where: {
        userId,
        status: { in: ['active', 'suspended'] },
      },
      include: {
        plan: true,
      },
      orderBy: { startDate: 'desc' },
    })

    if (!subscription) {
      return null
    }

    // 만료된 구독 확인
    if (new Date() > subscription.endDate) {
      await db.subscription.update({
        where: { id: subscription.id },
        data: { status: 'expired' },
      })
      return null
    }

    return {
      id: subscription.id,
      userId: subscription.userId,
      planType: subscription.plan.name.toLowerCase() as PlanType,
      status: subscription.status as SubscriptionStatus,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      autoRenew: true, // 기본값
      nextPaymentDate: null,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    }
  } catch (error) {
    logger.error('사용자 구독 상태 조회 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

/**
 * 구독 시작
 */
export async function createSubscription(
  userId: string,
  planType: PlanType,
  paymentTransactionId: string
): Promise<{
  subscriptionId: string
  planType: PlanType
  startDate: Date
  endDate: Date
  status: SubscriptionStatus
}> {
  try {
    // 기존 활성 구독 취소
    await db.subscription.updateMany({
      where: {
        userId,
        status: { in: ['active', 'suspended'] },
      },
      data: { status: 'cancelled' },
    })

    // 플랜 정보 조회
    const plan = await db.subscriptionPlan.findFirst({
      where: {
        name: {
          contains: planType,
          mode: 'insensitive',
        },
      },
    })

    if (!plan) {
      throw new Error('플랜을 찾을 수 없습니다')
    }

    // 구독 생성
    const startDate = new Date()
    const endDate = new Date(
      startDate.getTime() + plan.duration * 24 * 60 * 60 * 1000
    )

    const subscription = await db.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: 'active',
        startDate,
        endDate,
      },
    })

    // 결제 기록
    await db.payment.create({
      data: {
        userId,
        amount: plan.price,
        currency: 'KRW',
        status: 'completed',
        paymentMethod: 'card',
        transactionId: paymentTransactionId,
        reason: 'subscription',
        relatedId: subscription.id,
      },
    })

    logger.info('구독 생성됨', {
      subscriptionId: subscription.id,
      userId,
      planType,
      endDate,
    })

    return {
      subscriptionId: subscription.id,
      planType,
      startDate,
      endDate,
      status: 'active',
    }
  } catch (error) {
    logger.error('구독 생성 실패', {
      userId,
      planType,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 구독 업그레이드/다운그레이드
 */
export async function upgradeSubscription(
  userId: string,
  newPlanType: PlanType,
  paymentTransactionId: string
): Promise<UserSubscription> {
  try {
    const currentSubscription = await getUserSubscription(userId)

    if (!currentSubscription) {
      throw new Error('활성 구독이 없습니다')
    }

    // 새 플랜 정보 조회
    const newPlan = await db.subscriptionPlan.findFirst({
      where: {
        name: {
          contains: newPlanType,
          mode: 'insensitive',
        },
      },
    })

    if (!newPlan) {
      throw new Error('새 플랜을 찾을 수 없습니다')
    }

    // 기존 구독 취소
    await db.subscription.update({
      where: { id: currentSubscription.id },
      data: { status: 'cancelled', cancelledAt: new Date() },
    })

    // 새 구독 생성
    const newSubscription = await createSubscription(
      userId,
      newPlanType,
      paymentTransactionId
    )

    logger.info('구독 업그레이드됨', {
      userId,
      oldPlan: currentSubscription.planType,
      newPlan: newPlanType,
    })

    return {
      id: newSubscription.subscriptionId,
      userId,
      planType: newPlanType,
      status: 'active',
      startDate: newSubscription.startDate,
      endDate: newSubscription.endDate,
      autoRenew: true,
      nextPaymentDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  } catch (error) {
    logger.error('구독 업그레이드 실패', {
      userId,
      newPlanType,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 구독 취소
 */
export async function cancelSubscription(
  userId: string
): Promise<boolean> {
  try {
    const subscription = await getUserSubscription(userId)

    if (!subscription) {
      return false
    }

    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    })

    logger.info('구독 취소됨', { userId, subscriptionId: subscription.id })

    return true
  } catch (error) {
    logger.error('구독 취소 실패', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}

/**
 * 사용자 플랜 타입 조회
 */
export async function getUserPlanType(userId: string): Promise<PlanType> {
  try {
    const subscription = await getUserSubscription(userId)

    if (!subscription) {
      return 'free'
    }

    return subscription.planType
  } catch {
    return 'free'
  }
}

/**
 * 구독 만료 예정 사용자 조회
 */
export async function getExpiringSubscriptions(
  daysUntilExpiry: number = 7
): Promise<Array<{
  subscriptionId: string
  userId: string
  userEmail: string
  planType: PlanType
  expiryDate: Date
}>> {
  try {
    const startDate = new Date()
    const endDate = new Date(
      startDate.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000
    )

    const subscriptions = await db.subscription.findMany({
      where: {
        status: 'active',
        endDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        plan: true,
      },
    })

    logger.info('만료 예정 구독 조회', { count: subscriptions.length })

    return subscriptions.map((sub) => ({
      subscriptionId: sub.id,
      userId: sub.userId,
      userEmail: sub.user.email,
      planType: sub.plan.name.toLowerCase() as PlanType,
      expiryDate: sub.endDate,
    }))
  } catch (error) {
    logger.error('만료 예정 구독 조회 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return []
  }
}

/**
 * 구독 통계
 */
export async function getSubscriptionStatistics(): Promise<{
  totalSubscribers: number
  activeSubscriptions: number
  subscriptionByPlan: Record<PlanType, number>
  mrr: number // Monthly Recurring Revenue
  arr: number // Annual Recurring Revenue
  churnRate: number
}> {
  try {
    const subscriptions = await db.subscription.findMany({
      include: {
        plan: true,
      },
    })

    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === 'active'
    )

    const subscriptionByPlan = subscriptions.reduce(
      (acc, sub) => {
        const planType = sub.plan.name.toLowerCase() as PlanType
        acc[planType] = (acc[planType] || 0) + 1
        return acc
      },
      {} as Record<PlanType, number>
    )

    // MRR 계산
    const mrr = activeSubscriptions.reduce(
      (sum, sub) => sum + sub.plan.price,
      0
    )

    // 취소된 구독
    const cancelledCount = subscriptions.filter(
      (s) => s.status === 'cancelled'
    ).length

    // Churn Rate 계산 (취소된 수 / 총 수)
    const churnRate =
      subscriptions.length > 0
        ? (cancelledCount / subscriptions.length) * 100
        : 0

    logger.info('구독 통계 조회', {
      total: subscriptions.length,
      active: activeSubscriptions.length,
      mrr,
    })

    return {
      totalSubscribers: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      subscriptionByPlan,
      mrr,
      arr: mrr * 12,
      churnRate,
    }
  } catch (error) {
    logger.error('구독 통계 조회 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return {
      totalSubscribers: 0,
      activeSubscriptions: 0,
      subscriptionByPlan: {},
      mrr: 0,
      arr: 0,
      churnRate: 0,
    }
  }
}
