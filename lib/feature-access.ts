/**
 * 기능 접근 제어 (Feature Access Control)
 * 플랜별 기능 사용 제한 관리
 */

import { db } from './db'
import { logger } from './logging'
import { getUserPlanType, PlanType } from './subscription-system'

/**
 * 기능 접근 권한 확인
 */
export async function checkFeatureAccess(
  userId: string,
  feature: string
): Promise<boolean> {
  try {
    const planType = await getUserPlanType(userId)

    // 플랜별 기능 접근 권한
    const featureAccess: Record<PlanType, string[]> = {
      free: [
        'profile_view',
        'send_like',
        'send_message',
        'search',
        'basic_filters',
      ],
      basic: [
        'profile_view',
        'send_like',
        'send_message',
        'search',
        'advanced_filters',
        'rewind',
        'view_rewinds',
      ],
      plus: [
        'profile_view',
        'send_like',
        'send_message',
        'search',
        'advanced_filters',
        'rewind',
        'view_rewinds',
        'priority_matching',
        'no_ads',
        'boost_profile',
        'see_who_liked',
      ],
      premium: [
        'profile_view',
        'send_like',
        'send_message',
        'search',
        'all_filters',
        'rewind',
        'view_rewinds',
        'priority_matching',
        'no_ads',
        'boost_profile',
        'see_who_liked',
        'verified_badge',
        'customer_support',
      ],
      vip: [
        'profile_view',
        'send_like',
        'send_message',
        'search',
        'custom_filters',
        'unlimited_rewind',
        'priority_matching',
        'no_ads',
        'boost_profile',
        'see_who_liked',
        'vip_badge',
        'dedicated_manager',
        'priority_support',
        'unlimited_features',
      ],
    }

    const hasAccess = featureAccess[planType].includes(feature)

    if (!hasAccess) {
      logger.warn('기능 접근 거부', { userId, planType, feature })
    }

    return hasAccess
  } catch (error) {
    logger.error('기능 접근 확인 오류', {
      userId,
      feature,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}

/**
 * 일일 한도 확인 (메시지 전송 등)
 */
export async function checkDailyLimit(
  userId: string,
  action: string
): Promise<{
  allowed: boolean
  remaining: number
  limit: number
  resetTime: Date
}> {
  try {
    const planType = await getUserPlanType(userId)

    // 플랜별 일일 한도
    const dailyLimits: Record<PlanType, Record<string, number>> = {
      free: {
        messages: 5,
        likes: 10,
      },
      basic: {
        messages: 50,
        likes: 100,
      },
      plus: {
        messages: 200,
        likes: 500,
      },
      premium: {
        messages: 500,
        likes: 1000,
      },
      vip: {
        messages: 1000,
        likes: 5000,
      },
    }

    const limit = dailyLimits[planType][action] || 0

    // 오늘의 사용량 조회
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // 액션별 집계
    let usedCount = 0

    if (action === 'messages') {
      const messageCount = await db.message.count({
        where: {
          senderId: userId,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      })
      usedCount = messageCount
    } else if (action === 'likes') {
      const likeCount = await db.like.count({
        where: {
          fromUserId: userId,
          liked: true,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      })
      usedCount = likeCount
    }

    const remaining = Math.max(0, limit - usedCount)
    const allowed = remaining > 0

    logger.info('일일 한도 확인', {
      userId,
      planType,
      action,
      used: usedCount,
      limit,
      remaining,
    })

    return {
      allowed,
      remaining,
      limit,
      resetTime: tomorrow,
    }
  } catch (error) {
    logger.error('일일 한도 확인 오류', {
      userId,
      action,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    // 오류 발생 시 안전하게 접근 허용
    return {
      allowed: true,
      remaining: 1,
      limit: 1,
      resetTime: new Date(),
    }
  }
}

/**
 * 월간 한도 확인
 */
export async function checkMonthlyLimit(
  userId: string,
  action: string
): Promise<{
  allowed: boolean
  remaining: number
  limit: number
  resetTime: Date
}> {
  try {
    const planType = await getUserPlanType(userId)

    // 플랜별 월간 한도
    const monthlyLimits: Record<PlanType, Record<string, number>> = {
      free: {
        likes: 30,
        rewinds: 0,
      },
      basic: {
        likes: 200,
        rewinds: 5,
      },
      plus: {
        likes: 1000,
        rewinds: 20,
      },
      premium: {
        likes: 2000,
        rewinds: 50,
      },
      vip: {
        likes: 10000,
        rewinds: 1000,
      },
    }

    const limit = monthlyLimits[planType][action] || 0

    // 이번 달 사용량 조회
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    let usedCount = 0

    if (action === 'likes') {
      const likeCount = await db.like.count({
        where: {
          fromUserId: userId,
          liked: true,
          createdAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      })
      usedCount = likeCount
    } else if (action === 'rewinds') {
      // 재실행 사용 기록 조회 (커스텀 테이블 필요)
      usedCount = 0
    }

    const remaining = Math.max(0, limit - usedCount)
    const allowed = remaining > 0

    logger.info('월간 한도 확인', {
      userId,
      planType,
      action,
      used: usedCount,
      limit,
      remaining,
    })

    return {
      allowed,
      remaining,
      limit,
      resetTime: monthEnd,
    }
  } catch (error) {
    logger.error('월간 한도 확인 오류', {
      userId,
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
}

/**
 * 프로필 부스트 수준 조회
 */
export async function getProfileBoostLevel(userId: string): Promise<number> {
  try {
    const planType = await getUserPlanType(userId)

    const boostLevels: Record<PlanType, number> = {
      free: 1,
      basic: 1.5,
      plus: 3,
      premium: 5,
      vip: 10,
    }

    return boostLevels[planType]
  } catch {
    return 1
  }
}

/**
 * 검색 필터 개수 조회
 */
export async function getSearchFilterCount(userId: string): Promise<number> {
  try {
    const planType = await getUserPlanType(userId)

    const filterCounts: Record<PlanType, number> = {
      free: 3,
      basic: 6,
      plus: 12,
      premium: 20,
      vip: 30,
    }

    return filterCounts[planType]
  } catch {
    return 3
  }
}

/**
 * 프로필 조회 제한 조회
 */
export async function getProfileViewLimit(userId: string): Promise<number> {
  try {
    const planType = await getUserPlanType(userId)

    const viewLimits: Record<PlanType, number> = {
      free: 10,
      basic: 100,
      plus: 500,
      premium: 1000,
      vip: 5000,
    }

    return viewLimits[planType]
  } catch {
    return 10
  }
}

/**
 * 광고 표시 여부 확인
 */
export async function shouldShowAds(userId: string): Promise<boolean> {
  try {
    const planType = await getUserPlanType(userId)

    // 무광고 플랜
    const adFreePlans: PlanType[] = ['plus', 'premium', 'vip']

    return !adFreePlans.includes(planType)
  } catch {
    return true // 기본적으로 광고 표시
  }
}

/**
 * 우선 매칭 활성화 여부 확인
 */
export async function hasPriorityMatching(userId: string): Promise<boolean> {
  try {
    const planType = await getUserPlanType(userId)

    const priorityPlans: PlanType[] = ['plus', 'premium', 'vip']

    return priorityPlans.includes(planType)
  } catch {
    return false
  }
}

/**
 * 기능 업그레이드 필요 여부 확인
 */
export async function isFeatureUnavailable(
  userId: string,
  feature: string
): Promise<{
  unavailable: boolean
  requiredPlan: PlanType | null
  reason: string
}> {
  try {
    const hasAccess = await checkFeatureAccess(userId, feature)

    if (hasAccess) {
      return {
        unavailable: false,
        requiredPlan: null,
        reason: '',
      }
    }

    // 기능별 최소 필요 플랜
    const requiredPlans: Record<string, PlanType> = {
      priority_matching: 'plus',
      no_ads: 'plus',
      boost_profile: 'plus',
      see_who_liked: 'plus',
      verified_badge: 'premium',
      customer_support: 'premium',
      dedicated_manager: 'vip',
      priority_support: 'vip',
      unlimited_features: 'vip',
    }

    const requiredPlan = requiredPlans[feature] || null

    return {
      unavailable: true,
      requiredPlan,
      reason: `이 기능은 ${requiredPlan} 플랜 이상에서 사용 가능합니다.`,
    }
  } catch (error) {
    logger.error('기능 가용성 확인 오류', {
      userId,
      feature,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return {
      unavailable: true,
      requiredPlan: null,
      reason: '기능 확인 중 오류가 발생했습니다.',
    }
  }
}
