import { prisma } from '@/lib/db';
import { UserBlock, Report, Prisma } from '@prisma/client';

export type ReportType = 
  | 'inappropriate_content'
  | 'fake_profile'
  | 'harassment'
  | 'spam'
  | 'suspicious_activity'
  | 'scam'
  | 'underage'
  | 'other';

export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';
export type BlockStatus = 'active' | 'removed';

export interface ReportWithDetails extends Report {
  reporter?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  reportedUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

/**
 * Block a user
 */
export async function blockUser(
  blockerId: string,
  blockedId: string,
  reason?: string
): Promise<UserBlock> {
  if (blockerId === blockedId) {
    throw new Error('Cannot block yourself');
  }

  // Check if already blocked
  const existing = await prisma.userBlock.findUnique({
    where: {
      blockerId_blockedId: {
        blockerId,
        blockedId,
      },
    },
  });

  if (existing && existing.status === 'active') {
    throw new Error('User already blocked');
  }

  // If previously removed, reactivate
  if (existing && existing.status === 'removed') {
    return prisma.userBlock.update({
      where: { id: existing.id },
      data: {
        status: 'active',
        reason,
        blockedAt: new Date(),
      },
    });
  }

  // Create new block
  return prisma.userBlock.create({
    data: {
      blockerId,
      blockedId,
      reason,
      status: 'active',
    },
  });
}

/**
 * Unblock a user
 */
export async function unblockUser(blockerId: string, blockedId: string): Promise<UserBlock> {
  const block = await prisma.userBlock.findUnique({
    where: {
      blockerId_blockedId: {
        blockerId,
        blockedId,
      },
    },
  });

  if (!block) {
    throw new Error('User not blocked');
  }

  return prisma.userBlock.update({
    where: { id: block.id },
    data: {
      status: 'removed',
      unblockedAt: new Date(),
    },
  });
}

/**
 * Check if user is blocked
 */
export async function isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const block = await prisma.userBlock.findUnique({
    where: {
      blockerId_blockedId: {
        blockerId,
        blockedId,
      },
    },
  });

  return block?.status === 'active' ?? false;
}

/**
 * Get user's blocked list
 */
export async function getBlockedUsers(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<Array<{ id: string; firstName: string; lastName: string; blockedAt: Date }>> {
  const blocks = await prisma.userBlock.findMany({
    where: {
      blockerId: userId,
      status: 'active',
    },
    include: {
      blockedUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      blockedAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  return blocks.map((block) => ({
    ...block.blockedUser,
    blockedAt: block.blockedAt,
  }));
}

/**
 * Get users blocking this user
 */
export async function getUsersBlockingMe(userId: string): Promise<number> {
  return prisma.userBlock.count({
    where: {
      blockedId: userId,
      status: 'active',
    },
  });
}

/**
 * Create a report
 */
export async function createReport(
  reporterId: string,
  reportedUserId: string,
  type: ReportType,
  description: string,
  relatedId?: string
): Promise<Report> {
  if (reporterId === reportedUserId) {
    throw new Error('Cannot report yourself');
  }

  if (!description?.trim()) {
    throw new Error('Description is required');
  }

  if (description.length > 1000) {
    throw new Error('Description too long (max 1000 characters)');
  }

  // Check for duplicate reports
  const recent = await prisma.report.findFirst({
    where: {
      reporterId,
      reportedUserId,
      type,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
  });

  if (recent) {
    throw new Error('You already reported this user recently');
  }

  return prisma.report.create({
    data: {
      reporterId,
      reportedUserId,
      type,
      description: description.trim(),
      relatedId,
      status: 'pending',
    },
  });
}

/**
 * Get reports for admin review
 */
export async function getReports(
  status?: ReportStatus,
  limit: number = 20,
  offset: number = 0
): Promise<ReportWithDetails[]> {
  return prisma.report.findMany({
    where: {
      ...(status && { status }),
    },
    include: {
      reporter: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      reportedUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  }) as Promise<ReportWithDetails[]>;
}

/**
 * Get user's reports
 */
export async function getUserReports(
  reportedUserId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ReportWithDetails[]> {
  return prisma.report.findMany({
    where: {
      reportedUserId,
    },
    include: {
      reporter: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  }) as Promise<ReportWithDetails[]>;
}

/**
 * Update report status
 */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  adminNotes?: string
): Promise<Report> {
  return prisma.report.update({
    where: { id: reportId },
    data: {
      status,
      adminNotes,
      reviewedAt: new Date(),
    },
  });
}

/**
 * Get report count by status
 */
export async function getReportCounts(): Promise<{
  pending: number;
  investigating: number;
  resolved: number;
  dismissed: number;
}> {
  const [pending, investigating, resolved, dismissed] = await Promise.all([
    prisma.report.count({ where: { status: 'pending' } }),
    prisma.report.count({ where: { status: 'investigating' } }),
    prisma.report.count({ where: { status: 'resolved' } }),
    prisma.report.count({ where: { status: 'dismissed' } }),
  ]);

  return { pending, investigating, resolved, dismissed };
}

/**
 * Get report statistics
 */
export async function getReportStats(daysBack: number = 30): Promise<{
  totalReports: number;
  reportsByType: Record<ReportType, number>;
  reportsByStatus: Record<ReportStatus, number>;
  usersWithMostReports: Array<{ userId: string; count: number; firstName: string; lastName: string }>;
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const [totalReports, byType, byStatus, usersWithMost] = await Promise.all([
    prisma.report.count({
      where: { createdAt: { gte: cutoffDate } },
    }),
    prisma.report.groupBy({
      by: ['type'],
      _count: true,
      where: { createdAt: { gte: cutoffDate } },
    }),
    prisma.report.groupBy({
      by: ['status'],
      _count: true,
      where: { createdAt: { gte: cutoffDate } },
    }),
    prisma.report.groupBy({
      by: ['reportedUserId'],
      _count: true,
      where: { createdAt: { gte: cutoffDate } },
      orderBy: { _count: { reportedUserId: 'desc' } },
      take: 10,
    }),
  ]);

  // Build report type map
  const reportsByType: Record<ReportType, number> = {
    inappropriate_content: 0,
    fake_profile: 0,
    harassment: 0,
    spam: 0,
    suspicious_activity: 0,
    scam: 0,
    underage: 0,
    other: 0,
  };

  byType.forEach((item) => {
    reportsByType[item.type as ReportType] = item._count;
  });

  // Build status map
  const reportsByStatus: Record<ReportStatus, number> = {
    pending: 0,
    investigating: 0,
    resolved: 0,
    dismissed: 0,
  };

  byStatus.forEach((item) => {
    reportsByStatus[item.status as ReportStatus] = item._count;
  });

  // Get user details for top reported
  const topReportedIds = usersWithMost.map((item) => item.reportedUserId);
  const users = await prisma.user.findMany({
    where: { id: { in: topReportedIds } },
    select: { id: true, firstName: true, lastName: true },
  });

  const usersWithMostReports = usersWithMost.map((item) => {
    const user = users.find((u) => u.id === item.reportedUserId);
    return {
      userId: item.reportedUserId,
      count: item._count.reportedUserId,
      firstName: user?.firstName || 'Unknown',
      lastName: user?.lastName || 'User',
    };
  });

  return {
    totalReports,
    reportsByType,
    reportsByStatus,
    usersWithMostReports,
  };
}

/**
 * Suspend user account
 */
export async function suspendUser(
  userId: string,
  reason: string,
  durationDays: number = 7
): Promise<void> {
  const suspendedUntil = new Date();
  suspendedUntil.setDate(suspendedUntil.getDate() + durationDays);

  await prisma.user.update({
    where: { id: userId },
    data: {
      suspendedAt: new Date(),
      suspendedUntil,
      suspendReason: reason,
    },
  });
}

/**
 * Check if user is suspended
 */
export async function isUserSuspended(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { suspendedUntil: true },
  });

  if (!user?.suspendedUntil) return false;

  return user.suspendedUntil > new Date();
}

/**
 * Unsuspend user
 */
export async function unsuspendUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      suspendedAt: null,
      suspendedUntil: null,
      suspendReason: null,
    },
  });
}

/**
 * Permanently ban user
 */
export async function banUser(userId: string, reason: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      bannedAt: new Date(),
      banReason: reason,
      isBanned: true,
    },
  });
}

/**
 * Check if user is banned
 */
export async function isUserBanned(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isBanned: true },
  });

  return user?.isBanned ?? false;
}

/**
 * Get moderation queue stats
 */
export async function getModerationStats(): Promise<{
  pendingReports: number;
  investigatingReports: number;
  suspendedUsers: number;
  bannedUsers: number;
  reportedUsersThisMonth: number;
}> {
  const thisMonth = new Date();
  thisMonth.setDate(1);

  const [pending, investigating, suspended, banned, reportedThisMonth] = await Promise.all([
    prisma.report.count({ where: { status: 'pending' } }),
    prisma.report.count({ where: { status: 'investigating' } }),
    prisma.user.count({ where: { suspendedAt: { not: null } } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.report.count({ where: { createdAt: { gte: thisMonth } } }),
  ]);

  return {
    pendingReports: pending,
    investigatingReports: investigating,
    suspendedUsers: suspended,
    bannedUsers: banned,
    reportedUsersThisMonth: reportedThisMonth,
  };
}

/**
 * Check if can communicate (not blocked, suspended, or banned)
 */
export async function canCommunicate(userId1: string, userId2: string): Promise<{
  canCommunicate: boolean;
  reason?: string;
}> {
  // Check if either user is banned
  const [isBanned1, isBanned2] = await Promise.all([
    isUserBanned(userId1),
    isUserBanned(userId2),
  ]);

  if (isBanned1 || isBanned2) {
    return { canCommunicate: false, reason: 'User account banned' };
  }

  // Check if either user is suspended
  const [isSuspended1, isSuspended2] = await Promise.all([
    isUserSuspended(userId1),
    isUserSuspended(userId2),
  ]);

  if (isSuspended1 || isSuspended2) {
    return { canCommunicate: false, reason: 'Account temporarily suspended' };
  }

  // Check if blocked
  const isBlocked = await isUserBlocked(userId1, userId2);
  if (isBlocked) {
    return { canCommunicate: false, reason: 'User has blocked you' };
  }

  // Check reverse block
  const isBlockedReverse = await isUserBlocked(userId2, userId1);
  if (isBlockedReverse) {
    return { canCommunicate: false, reason: 'You have blocked this user' };
  }

  return { canCommunicate: true };
}
