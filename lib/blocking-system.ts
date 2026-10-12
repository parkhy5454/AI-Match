/**
 * 차단 및 신고 시스템
 * 사용자 안전과 커뮤니티 관리
 */

import { db } from './db'
import { logger } from './logging'

/**
 * 신고 카테고리
 */
export enum ReportCategory {
  HARASSMENT = 'harassment', // 괴롭힘
  FAKE_PROFILE = 'fake_profile', // 가짜 프로필
  INAPPROPRIATE_CONTENT = 'inappropriate_content', // 부적절한 콘텐츠
  SCAM = 'scam', // 사기
  EXPLICIT_CONTENT = 'explicit_content', // 노골적 콘텐츠
  UNDERAGE = 'underage', // 미성년자
  OTHER = 'other', // 기타
}

/**
 * 신고 상태
 */
export enum ReportStatus {
  PENDING = 'pending', // 대기중
  INVESTIGATING = 'investigating', // 조사중
  RESOLVED = 'resolved', // 해결됨
  DISMISSED = 'dismissed', // 각하됨
  ACTION_TAKEN = 'action_taken', // 조치됨
}

/**
 * 신고 상세 데이터
 */
export interface ReportData {
  id: string
  reporterId: string
  reportedUserId: string
  category: ReportCategory
  description: string
  status: ReportStatus
  attachmentUrls?: string[]
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  adminNotes?: string
}

/**
 * 차단 상세 데이터
 */
export interface BlockData {
  id: string
  blockerId: string
  blockedUserId: string
  reason?: string
  createdAt: Date
}

/**
 * 사용자를 차단합니다
 */
export async function blockUser(
  blockerId: string,
  blockedUserId: string,
  reason?: string
): Promise<BlockData> {
  try {
    if (blockerId === blockedUserId) {
      throw new Error('자기 자신을 차단할 수 없습니다')
    }

    // 기존 차단 확인
    const existingBlock = await db.userBlock.findUnique({
      where: {
        blockerId_blockedUserId: {
          blockerId,
          blockedUserId,
        },
      },
    })

    if (existingBlock) {
      logger.warn('이미 차단된 사용자', {
        blockerId,
        blockedUserId,
      })
      return existingBlock as BlockData
    }

    // 차단 생성
    const block = await db.userBlock.create({
      data: {
        blockerId,
        blockedUserId,
        reason: reason || null,
      },
    })

    logger.info('사용자 차단됨', {
      blockerId,
      blockedUserId,
      reason,
    })

    return block as BlockData
  } catch (error) {
    logger.error('사용자 차단 실패', {
      blockerId,
      blockedUserId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 사용자 차단을 해제합니다
 */
export async function unblockUser(
  blockerId: string,
  blockedUserId: string
): Promise<boolean> {
  try {
    const result = await db.userBlock.delete({
      where: {
        blockerId_blockedUserId: {
          blockerId,
          blockedUserId,
        },
      },
    })

    logger.info('사용자 차단 해제됨', {
      blockerId,
      blockedUserId,
    })

    return !!result
  } catch (error) {
    logger.warn('사용자 차단 해제 실패 (이미 해제됨 또는 존재하지 않음)', {
      blockerId,
      blockedUserId,
    })
    return false
  }
}

/**
 * 사용자가 차단된 사람 목록 조회
 */
export async function getBlockedUsers(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  blocks: Array<{
    blockedUser: { id: string; username: string; profileImage?: string }
    reason?: string
    blockedAt: Date
  }>
  total: number
  limit: number
  offset: number
}> {
  try {
    const [blocks, total] = await Promise.all([
      db.userBlock.findMany({
        where: { blockerId: userId },
        include: {
          blockedUser: {
            select: {
              id: true,
              username: true,
              profileImage: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.userBlock.count({
        where: { blockerId: userId },
      }),
    ])

    return {
      blocks: blocks.map((b) => ({
        blockedUser: b.blockedUser,
        reason: b.reason,
        blockedAt: b.createdAt,
      })),
      total,
      limit,
      offset,
    }
  } catch (error) {
    logger.error('차단된 사용자 목록 조회 실패', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 사용자가 차단한 사람 목록 조회
 */
export async function getBlockers(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  blockers: Array<{
    blockerUser: { id: string; username: string }
    blockedAt: Date
  }>
  total: number
}> {
  try {
    const [blockers, total] = await Promise.all([
      db.userBlock.findMany({
        where: { blockedUserId: userId },
        include: {
          blockerUser: {
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
      db.userBlock.count({
        where: { blockedUserId: userId },
      }),
    ])

    return {
      blockers: blockers.map((b) => ({
        blockerUser: b.blockerUser,
        blockedAt: b.createdAt,
      })),
      total,
    }
  } catch (error) {
    logger.error('나를 차단한 사용자 목록 조회 실패', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 특정 사용자가 다른 사용자를 차단했는지 확인
 */
export async function isUserBlocked(
  blockerId: string,
  blockedUserId: string
): Promise<boolean> {
  try {
    const block = await db.userBlock.findUnique({
      where: {
        blockerId_blockedUserId: {
          blockerId,
          blockedUserId,
        },
      },
    })

    return !!block
  } catch (error) {
    logger.error('차단 상태 확인 실패', {
      blockerId,
      blockedUserId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}

/**
 * 사용자를 신고합니다
 */
export async function reportUser(
  reporterId: string,
  reportedUserId: string,
  category: ReportCategory,
  description: string,
  attachmentUrls?: string[]
): Promise<ReportData> {
  try {
    if (reporterId === reportedUserId) {
      throw new Error('자기 자신을 신고할 수 없습니다')
    }

    if (!description || description.trim().length === 0) {
      throw new Error('신고 사유는 필수입니다')
    }

    if (description.length > 1000) {
      throw new Error('신고 사유는 1000자 이하여야 합니다')
    }

    // 중복 신고 확인 (최근 7일)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentReport = await db.userReport.findFirst({
      where: {
        reporterId,
        reportedUserId,
        category,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    })

    if (recentReport) {
      throw new Error('최근 7일 내에 같은 이유로 이미 신고했습니다')
    }

    // 신고 생성
    const report = await db.userReport.create({
      data: {
        reporterId,
        reportedUserId,
        category,
        description,
        attachmentUrls: attachmentUrls?.join(',') || null,
        status: ReportStatus.PENDING,
      },
    })

    logger.info('사용자 신고됨', {
      reportId: report.id,
      reporterId,
      reportedUserId,
      category,
    })

    return report as ReportData
  } catch (error) {
    logger.error('사용자 신고 실패', {
      reporterId,
      reportedUserId,
      category,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 신고 목록 조회 (사용자)
 */
export async function getUserReports(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  reports: ReportData[]
  total: number
  limit: number
  offset: number
}> {
  try {
    const [reports, total] = await Promise.all([
      db.userReport.findMany({
        where: { reporterId: userId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.userReport.count({
        where: { reporterId: userId },
      }),
    ])

    return {
      reports: reports as ReportData[],
      total,
      limit,
      offset,
    }
  } catch (error) {
    logger.error('신고 목록 조회 실패', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 신고된 사용자의 신고 목록 조회 (관리자용)
 */
export async function getReportsForUser(
  reportedUserId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  reports: ReportData[]
  total: number
  uniqueReporters: number
}> {
  try {
    const [reports, total, uniqueReporters] = await Promise.all([
      db.userReport.findMany({
        where: { reportedUserId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.userReport.count({
        where: { reportedUserId },
      }),
      db.userReport.findMany({
        where: { reportedUserId },
        distinct: ['reporterId'],
        select: { reporterId: true },
      }),
    ])

    return {
      reports: reports as ReportData[],
      total,
      uniqueReporters: uniqueReporters.length,
    }
  } catch (error) {
    logger.error('신고 목록 조회 실패 (관리자)', {
      reportedUserId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 신고 상태 업데이트 (관리자용)
 */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  adminNotes?: string
): Promise<ReportData> {
  try {
    const report = await db.userReport.update({
      where: { id: reportId },
      data: {
        status,
        adminNotes: adminNotes || null,
        resolvedAt: [ReportStatus.RESOLVED, ReportStatus.DISMISSED, ReportStatus.ACTION_TAKEN].includes(status)
          ? new Date()
          : null,
      },
    })

    logger.info('신고 상태 업데이트됨', {
      reportId,
      newStatus: status,
      adminNotes,
    })

    return report as ReportData
  } catch (error) {
    logger.error('신고 상태 업데이트 실패', {
      reportId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * 차단된 사용자 간 메시지 필터링
 */
export async function canSendMessage(
  senderId: string,
  recipientId: string
): Promise<boolean> {
  try {
    // 양방향 차단 확인
    const [senderBlocked, recipientBlocked] = await Promise.all([
      isUserBlocked(senderId, recipientId),
      isUserBlocked(recipientId, senderId),
    ])

    if (senderBlocked || recipientBlocked) {
      logger.warn('차단된 사용자에게 메시지 시도', {
        senderId,
        recipientId,
        senderBlocked,
        recipientBlocked,
      })
      return false
    }

    return true
  } catch (error) {
    logger.error('메시지 전송 권한 확인 실패', {
      senderId,
      recipientId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}

/**
 * 차단된 사용자 제외 필터링 (추천, 검색 등)
 */
export async function getAccessibleUserIds(
  userId: string
): Promise<Set<string>> {
  try {
    const [blocked, blockers] = await Promise.all([
      db.userBlock.findMany({
        where: { blockerId: userId },
        select: { blockedUserId: true },
      }),
      db.userBlock.findMany({
        where: { blockedUserId: userId },
        select: { blockerId: true },
      }),
    ])

    const blockedSet = new Set([
      ...blocked.map((b) => b.blockedUserId),
      ...blockers.map((b) => b.blockerId),
    ])

    return blockedSet
  } catch (error) {
    logger.error('접근 가능한 사용자 목록 조회 실패', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return new Set()
  }
}

/**
 * 대시보드 통계 (관리자용)
 */
export async function getDashboardStats(): Promise<{
  totalReports: number
  pendingReports: number
  investigatingReports: number
  resolvedReports: number
  totalBlocks: number
  reportsByCategory: Record<string, number>
  reportsThisWeek: number
}> {
  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [
      totalReports,
      pendingReports,
      investigatingReports,
      resolvedReports,
      totalBlocks,
      reportsByCategory,
      reportsThisWeek,
    ] = await Promise.all([
      db.userReport.count(),
      db.userReport.count({ where: { status: ReportStatus.PENDING } }),
      db.userReport.count({
        where: { status: ReportStatus.INVESTIGATING },
      }),
      db.userReport.count({
        where: {
          status: {
            in: [ReportStatus.RESOLVED, ReportStatus.DISMISSED, ReportStatus.ACTION_TAKEN],
          },
        },
      }),
      db.userBlock.count(),
      db.userReport.groupBy({
        by: ['category'],
        _count: true,
      }),
      db.userReport.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    ])

    const categoryStats = reportsByCategory.reduce(
      (acc, item) => {
        acc[item.category] = item._count
        return acc
      },
      {} as Record<string, number>
    )

    return {
      totalReports,
      pendingReports,
      investigatingReports,
      resolvedReports,
      totalBlocks,
      reportsByCategory: categoryStats,
      reportsThisWeek,
    }
  } catch (error) {
    logger.error('대시보드 통계 조회 실패', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}
