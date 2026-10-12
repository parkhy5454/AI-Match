import { prisma } from '@/lib/db';

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  suspendedUsers: number;
  bannedUsers: number;
  totalMatches: number;
  totalMessages: number;
  totalReports: number;
  pendingReports: number;
  totalRevenue: number;
  activeSubscriptions: number;
  conversionRate: number;
}

export interface UserManagementData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  isVerified: boolean;
  isBanned: boolean;
  suspendedUntil: Date | null;
  lastActiveAt: Date | null;
  profileCompleteness: number;
  totalMatches: number;
  totalReports: number;
}

export interface AdminLog {
  id: string;
  adminId: string;
  action: string;
  targetUserId?: string;
  targetReportId?: string;
  details: Record<string, any>;
  createdAt: Date;
}

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalUsers,
    activeUsers,
    newUsersThisMonth,
    suspendedUsers,
    bannedUsers,
    totalMatches,
    totalMessages,
    totalReports,
    pendingReports,
    activeSubscriptions,
    subscriptionData,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        lastActiveAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.user.count({
      where: { suspendedAt: { not: null } },
    }),
    prisma.user.count({
      where: { isBanned: true },
    }),
    prisma.match.count(),
    prisma.message.count(),
    prisma.report.count(),
    prisma.report.count({
      where: { status: 'pending' },
    }),
    prisma.subscription.count({
      where: {
        status: 'active',
      },
    }),
    prisma.subscription.groupBy({
      by: ['plan'],
      _sum: {
        amount: true,
      },
      where: {
        status: 'active',
      },
    }),
  ]);

  const totalRevenue = subscriptionData.reduce((sum, sub) => {
    return sum + (sub._sum.amount || 0);
  }, 0);

  const conversionRate = totalUsers > 0 ? (activeSubscriptions / totalUsers) * 100 : 0;

  return {
    totalUsers,
    activeUsers,
    newUsersThisMonth,
    suspendedUsers,
    bannedUsers,
    totalMatches,
    totalMessages,
    totalReports,
    pendingReports,
    totalRevenue,
    activeSubscriptions,
    conversionRate,
  };
}

/**
 * Get all users with detailed information
 */
export async function getAllUsers(
  limit: number = 50,
  offset: number = 0,
  filter?: {
    search?: string;
    status?: 'active' | 'suspended' | 'banned';
    verified?: boolean;
  }
): Promise<UserManagementData[]> {
  const where: any = {};

  if (filter?.search) {
    where.OR = [
      { email: { contains: filter.search, mode: 'insensitive' } },
      { firstName: { contains: filter.search, mode: 'insensitive' } },
      { lastName: { contains: filter.search, mode: 'insensitive' } },
    ];
  }

  if (filter?.status === 'suspended') {
    where.suspendedAt = { not: null };
  } else if (filter?.status === 'banned') {
    where.isBanned = true;
  } else if (filter?.status === 'active') {
    where.isBanned = false;
    where.suspendedAt = null;
  }

  if (filter?.verified !== undefined) {
    where.isVerified = filter.verified;
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      isVerified: true,
      isBanned: true,
      suspendedUntil: true,
      lastActiveAt: true,
      profileCompleteness: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const userIds = users.map((u) => u.id);
  const matchData = await prisma.match.groupBy({
    by: ['userId1'],
    _count: true,
    where: {
      userId1: { in: userIds },
    },
  });

  const reportData = await prisma.report.groupBy({
    by: ['reportedUserId'],
    _count: true,
    where: {
      reportedUserId: { in: userIds },
    },
  });

  return users.map((user) => ({
    ...user,
    totalMatches: matchData.find((m) => m.userId1 === user.id)?._count || 0,
    totalReports: reportData.find((r) => r.reportedUserId === user.id)?._count || 0,
  }));
}

/**
 * Get user details
 */
export async function getUserDetails(userId: string): Promise<UserManagementData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      createdAt: true,
      isVerified: true,
      isBanned: true,
      suspendedUntil: true,
      lastActiveAt: true,
      profileCompleteness: true,
    },
  });

  if (!user) return null;

  const [totalMatches, totalReports] = await Promise.all([
    prisma.match.count({ where: { userId1: userId } }),
    prisma.report.count({ where: { reportedUserId: userId } }),
  ]);

  return {
    ...user,
    totalMatches,
    totalReports,
  };
}

/**
 * Search users by various criteria
 */
export async function searchUsers(
  query: string,
  limit: number = 50,
  offset: number = 0
): Promise<UserManagementData[]> {
  return getAllUsers(limit, offset, { search: query });
}

/**
 * Get revenue analytics
 */
export async function getRevenueAnalytics(daysBack: number = 30): Promise<{
  totalRevenue: number;
  revenueByPlan: Record<string, number>;
  revenueByPeriod: { date: string; amount: number }[];
  averageLifetimeValue: number;
  churnRate: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const [byPlan, cancelledCount, activeCount] = await Promise.all([
    prisma.subscription.groupBy({
      by: ['plan'],
      _sum: {
        amount: true,
      },
      _count: true,
      where: {
        status: 'active',
        createdAt: { gte: startDate },
      },
    }),
    prisma.subscription.count({
      where: {
        status: 'cancelled',
        cancellationDate: { gte: startDate },
      },
    }),
    prisma.subscription.count({
      where: { status: 'active' },
    }),
  ]);

  const totalRevenue = byPlan.reduce((sum, sub) => {
    return sum + (sub._sum.amount || 0);
  }, 0);

  const revenueByPlan: Record<string, number> = {};
  byPlan.forEach((sub) => {
    revenueByPlan[sub.plan] = sub._sum.amount || 0;
  });

  const averageLifetimeValue = activeCount > 0 ? totalRevenue / activeCount : 0;
  const churnRate = activeCount > 0 ? (cancelledCount / (activeCount + cancelledCount)) * 100 : 0;

  return {
    totalRevenue,
    revenueByPlan,
    revenueByPeriod: [],
    averageLifetimeValue,
    churnRate,
  };
}

/**
 * Get user engagement metrics
 */
export async function getEngagementMetrics(): Promise<{
  averageMessagesPerUser: number;
  averageMatchesPerUser: number;
  profileCompletionRate: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  messagesSentToday: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalUsers,
    totalMessages,
    totalMatches,
    totalProfileCompletion,
    dailyActiveUsers,
    weeklyActiveUsers,
    monthlyActiveUsers,
    messagesToday,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.message.count(),
    prisma.match.count(),
    prisma.user.aggregate({
      _avg: {
        profileCompleteness: true,
      },
    }),
    prisma.user.count({
      where: {
        lastActiveAt: { gte: today },
      },
    }),
    prisma.user.count({
      where: {
        lastActiveAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.user.count({
      where: {
        lastActiveAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.message.count({
      where: {
        createdAt: { gte: today },
      },
    }),
  ]);

  return {
    averageMessagesPerUser: totalUsers > 0 ? totalMessages / totalUsers : 0,
    averageMatchesPerUser: totalUsers > 0 ? totalMatches / totalUsers : 0,
    profileCompletionRate: totalProfileCompletion._avg.profileCompleteness || 0,
    dailyActiveUsers,
    weeklyActiveUsers,
    monthlyActiveUsers,
    messagesSentToday: messagesToday,
  };
}

/**
 * Log admin action
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  details: {
    targetUserId?: string;
    targetReportId?: string;
    reason?: string;
    duration?: number;
    notes?: string;
    [key: string]: any;
  }
): Promise<AdminLog> {
  return prisma.adminLog.create({
    data: {
      adminId,
      action,
      targetUserId: details.targetUserId,
      targetReportId: details.targetReportId,
      details,
    },
  });
}

/**
 * Get admin action logs
 */
export async function getAdminLogs(
  limit: number = 50,
  offset: number = 0,
  filter?: {
    adminId?: string;
    action?: string;
    targetUserId?: string;
  }
): Promise<AdminLog[]> {
  const where: any = {};

  if (filter?.adminId) where.adminId = filter.adminId;
  if (filter?.action) where.action = filter.action;
  if (filter?.targetUserId) where.targetUserId = filter.targetUserId;

  return prisma.adminLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get system health status
 */
export async function getSystemHealth(): Promise<{
  databaseConnection: boolean;
  totalRecords: number;
  largestTable: string;
  recordsLastHour: number;
  apiStatus: string;
  averageResponseTime: number;
}> {
  try {
    const [userCount, messageCount, matchCount, reportCount] = await Promise.all([
      prisma.user.count(),
      prisma.message.count(),
      prisma.match.count(),
      prisma.report.count(),
    ]);

    const tables = [
      { name: 'User', count: userCount },
      { name: 'Message', count: messageCount },
      { name: 'Match', count: matchCount },
      { name: 'Report', count: reportCount },
    ];

    const largestTable = tables.reduce((prev, current) =>
      prev.count > current.count ? prev : current
    ).name;

    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const recordsLastHour = await prisma.message.count({
      where: {
        createdAt: { gte: oneHourAgo },
      },
    });

    return {
      databaseConnection: true,
      totalRecords: userCount + messageCount + matchCount + reportCount,
      largestTable,
      recordsLastHour,
      apiStatus: 'healthy',
      averageResponseTime: 50,
    };
  } catch (error) {
    return {
      databaseConnection: false,
      totalRecords: 0,
      largestTable: 'N/A',
      recordsLastHour: 0,
      apiStatus: 'error',
      averageResponseTime: 0,
    };
  }
}

/**
 * Get most active users
 */
export async function getMostActiveUsers(
  limit: number = 10,
  daysBack: number = 30
): Promise<
  Array<{
    id: string;
    firstName: string;
    lastName: string;
    messageCount: number;
    matchCount: number;
  }>
> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const activeUsers = await prisma.message.groupBy({
    by: ['senderId'],
    _count: true,
    where: {
      createdAt: { gte: startDate },
    },
    orderBy: { _count: { senderId: 'desc' } },
    take: limit,
  });

  const userIds = activeUsers.map((u) => u.senderId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  const matches = await prisma.match.groupBy({
    by: ['userId1'],
    _count: true,
    where: {
      userId1: { in: userIds },
      createdAt: { gte: startDate },
    },
  });

  return activeUsers.map((activity) => {
    const user = users.find((u) => u.id === activity.senderId);
    const userMatches = matches.find((m) => m.userId1 === activity.senderId);

    return {
      id: activity.senderId,
      firstName: user?.firstName || 'Unknown',
      lastName: user?.lastName || 'User',
      messageCount: activity._count.senderId,
      matchCount: userMatches?._count.userId1 || 0,
    };
  });
}

/**
 * Generate compliance report
 */
export async function getComplianceReport(
  daysBack: number = 30
): Promise<{
  reportedUsers: number;
  bannedUsers: number;
  suspendedUsers: number;
  reportResolutionRate: number;
  averageResolutionTime: number;
  mostCommonViolationType: string;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const [
    reportedUsersCount,
    bannedCount,
    suspendedCount,
    resolvedReports,
    totalReports,
    reportsByType,
  ] = await Promise.all([
    prisma.report.groupBy({
      by: ['reportedUserId'],
      where: { createdAt: { gte: startDate } },
    }),
    prisma.user.count({
      where: {
        bannedAt: { gte: startDate },
      },
    }),
    prisma.user.count({
      where: {
        suspendedAt: { gte: startDate },
      },
    }),
    prisma.report.count({
      where: {
        status: { in: ['resolved', 'dismissed'] },
        reviewedAt: { gte: startDate },
      },
    }),
    prisma.report.count({
      where: { createdAt: { gte: startDate } },
    }),
    prisma.report.groupBy({
      by: ['type'],
      _count: true,
      where: { createdAt: { gte: startDate } },
      orderBy: { _count: { type: 'desc' } },
      take: 1,
    }),
  ]);

  const resolutionRate = totalReports > 0 ? (resolvedReports / totalReports) * 100 : 0;

  return {
    reportedUsers: reportedUsersCount.length,
    bannedUsers: bannedCount,
    suspendedUsers: suspendedCount,
    reportResolutionRate: resolutionRate,
    averageResolutionTime: 24,
    mostCommonViolationType: reportsByType[0]?.type || 'N/A',
  };
}

/**
 * Suspend a user for a specified duration
 */
export async function suspendUser(
  userId: string,
  durationDays: number,
  reason: string
): Promise<UserManagementData | null> {
  const suspendedUntil = new Date();
  suspendedUntil.setDate(suspendedUntil.getDate() + durationDays);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      suspendedAt: new Date(),
      suspendedUntil,
    },
  });

  // Log the action
  await logAdminAction(
    'system',
    'suspend_user',
    userId,
    {
      durationDays,
      reason,
      suspendedUntil,
    }
  );

  return getUserDetails(userId);
}

/**
 * Ban a user permanently
 */
export async function banUser(
  userId: string,
  reason: string
): Promise<UserManagementData | null> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isBanned: true,
      bannedAt: new Date(),
    },
  });

  // Log the action
  await logAdminAction(
    'system',
    'ban_user',
    userId,
    {
      reason,
      bannedAt: new Date(),
    }
  );

  return getUserDetails(userId);
}

/**
 * Unban a user
 */
export async function unbanUser(userId: string): Promise<UserManagementData | null> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isBanned: false,
      bannedAt: null,
    },
  });

  // Log the action
  await logAdminAction(
    'system',
    'unban_user',
    userId,
    { unbannedAt: new Date() }
  );

  return getUserDetails(userId);
}
