import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db';
import {
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  searchUsers,
  getRevenueAnalytics,
  getEngagementMetrics,
  logAdminAction,
  getAdminLogs,
  getSystemHealth,
  getMostActiveUsers,
  getComplianceReport,
} from '@/lib/admin-system';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      aggregate: vi.fn(),
    },
    message: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    match: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    report: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    subscription: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    adminLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('Admin Dashboard System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should return comprehensive dashboard statistics', async () => {
      (prisma.user.count as any).mockResolvedValue(1000);
      (prisma.match.count as any).mockResolvedValue(5000);
      (prisma.message.count as any).mockResolvedValue(50000);
      (prisma.report.count as any).mockResolvedValue(100);
      (prisma.subscription.count as any).mockResolvedValue(500);
      (prisma.subscription.groupBy as any).mockResolvedValue([
        { plan: 'premium', _sum: { amount: 50000 } },
      ]);

      const stats = await getDashboardStats();

      expect(stats.totalUsers).toBe(1000);
      expect(stats.totalMatches).toBe(5000);
      expect(stats.totalMessages).toBe(50000);
      expect(stats.activeSubscriptions).toBe(500);
      expect(stats.totalRevenue).toBe(50000);
      expect(stats.conversionRate).toBe(50);
    });

    it('should calculate zero conversion rate when no users', async () => {
      (prisma.user.count as any).mockResolvedValue(0);
      (prisma.subscription.count as any).mockResolvedValue(0);
      (prisma.subscription.groupBy as any).mockResolvedValue([]);
      (prisma.match.count as any).mockResolvedValue(0);
      (prisma.message.count as any).mockResolvedValue(0);
      (prisma.report.count as any).mockResolvedValue(0);

      const stats = await getDashboardStats();

      expect(stats.conversionRate).toBe(0);
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated users list', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@test.com',
          firstName: 'John',
          lastName: 'Doe',
          createdAt: new Date(),
          isVerified: true,
          isBanned: false,
          suspendedUntil: null,
          lastActiveAt: new Date(),
          profileCompleteness: 85,
        },
      ];

      (prisma.user.findMany as any).mockResolvedValue(mockUsers);
      (prisma.match.groupBy as any).mockResolvedValue([
        { userId1: 'user-1', _count: 5 },
      ]);
      (prisma.report.groupBy as any).mockResolvedValue([]);

      const users = await getAllUsers(50, 0);

      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('user1@test.com');
      expect(users[0].totalMatches).toBe(5);
    });

    it('should filter users by search term', async () => {
      (prisma.user.findMany as any).mockResolvedValue([]);
      (prisma.match.groupBy as any).mockResolvedValue([]);
      (prisma.report.groupBy as any).mockResolvedValue([]);

      await getAllUsers(50, 0, { search: 'john' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });

    it('should filter users by status', async () => {
      (prisma.user.findMany as any).mockResolvedValue([]);
      (prisma.match.groupBy as any).mockResolvedValue([]);
      (prisma.report.groupBy as any).mockResolvedValue([]);

      await getAllUsers(50, 0, { status: 'banned' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isBanned: true,
          }),
        })
      );
    });
  });

  describe('getUserDetails', () => {
    it('should return user details with stats', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        firstName: 'Jane',
        lastName: 'Smith',
        createdAt: new Date(),
        isVerified: true,
        isBanned: false,
        suspendedUntil: null,
        lastActiveAt: new Date(),
        profileCompleteness: 90,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.match.count as any).mockResolvedValue(10);
      (prisma.report.count as any).mockResolvedValue(2);

      const user = await getUserDetails('user-1');

      expect(user?.email).toBe('user@test.com');
      expect(user?.totalMatches).toBe(10);
      expect(user?.totalReports).toBe(2);
    });

    it('should return null if user not found', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const user = await getUserDetails('nonexistent');

      expect(user).toBeNull();
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      (prisma.user.findMany as any).mockResolvedValue([]);
      (prisma.match.groupBy as any).mockResolvedValue([]);
      (prisma.report.groupBy as any).mockResolvedValue([]);

      await searchUsers('john doe', 50, 0);

      expect(prisma.user.findMany).toHaveBeenCalled();
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should return revenue analytics', async () => {
      (prisma.subscription.groupBy as any).mockResolvedValue([
        { plan: 'premium', _sum: { amount: 50000 }, _count: 500 },
        { plan: 'vip', _sum: { amount: 30000 }, _count: 100 },
      ]);
      (prisma.subscription.count as any)
        .mockResolvedValueOnce(50) // cancelled
        .mockResolvedValueOnce(600); // active

      const analytics = await getRevenueAnalytics(30);

      expect(analytics.totalRevenue).toBe(80000);
      expect(analytics.revenueByPlan.premium).toBe(50000);
      expect(analytics.averageLifetimeValue).toBeGreaterThan(0);
      expect(analytics.churnRate).toBeGreaterThan(0);
    });
  });

  describe('getEngagementMetrics', () => {
    it('should return engagement metrics', async () => {
      (prisma.user.count as any).mockResolvedValue(1000);
      (prisma.message.count as any).mockResolvedValue(50000);
      (prisma.match.count as any).mockResolvedValue(5000);
      (prisma.user.aggregate as any).mockResolvedValue({
        _avg: { profileCompleteness: 75 },
      });

      const metrics = await getEngagementMetrics();

      expect(metrics.averageMessagesPerUser).toBe(50);
      expect(metrics.averageMatchesPerUser).toBe(5);
      expect(metrics.profileCompletionRate).toBe(75);
    });
  });

  describe('logAdminAction', () => {
    it('should log admin action', async () => {
      const mockLog = {
        id: 'log-1',
        adminId: 'admin-1',
        action: 'BAN_USER',
        targetUserId: 'user-2',
        targetReportId: null,
        details: { reason: 'Violation' },
        createdAt: new Date(),
      };

      (prisma.adminLog.create as any).mockResolvedValue(mockLog);

      const log = await logAdminAction('admin-1', 'BAN_USER', {
        targetUserId: 'user-2',
        reason: 'Violation',
      });

      expect(log.action).toBe('BAN_USER');
      expect(log.targetUserId).toBe('user-2');
    });
  });

  describe('getAdminLogs', () => {
    it('should return admin logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          adminId: 'admin-1',
          action: 'BAN_USER',
          targetUserId: 'user-2',
          targetReportId: null,
          details: {},
          createdAt: new Date(),
        },
      ];

      (prisma.adminLog.findMany as any).mockResolvedValue(mockLogs);

      const logs = await getAdminLogs(50, 0);

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('BAN_USER');
    });

    it('should filter logs by adminId', async () => {
      (prisma.adminLog.findMany as any).mockResolvedValue([]);

      await getAdminLogs(50, 0, { adminId: 'admin-1' });

      expect(prisma.adminLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            adminId: 'admin-1',
          }),
        })
      );
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health status', async () => {
      (prisma.user.count as any).mockResolvedValue(1000);
      (prisma.message.count as any).mockResolvedValue(50000);
      (prisma.match.count as any).mockResolvedValue(5000);
      (prisma.report.count as any).mockResolvedValue(100);

      const health = await getSystemHealth();

      expect(health.databaseConnection).toBe(true);
      expect(health.totalRecords).toBe(56100);
      expect(health.apiStatus).toBe('healthy');
      expect(health.largestTable).toBe('Message');
    });

    it('should return error status on database failure', async () => {
      (prisma.user.count as any).mockRejectedValue(new Error('DB Error'));

      const health = await getSystemHealth();

      expect(health.databaseConnection).toBe(false);
      expect(health.apiStatus).toBe('error');
    });
  });

  describe('getMostActiveUsers', () => {
    it('should return most active users', async () => {
      const activeUsers = [
        { senderId: 'user-1', _count: { senderId: 100 } },
        { senderId: 'user-2', _count: { senderId: 80 } },
      ];

      (prisma.message.groupBy as any)
        .mockResolvedValueOnce(activeUsers)
        .mockResolvedValueOnce([]);

      (prisma.user.findMany as any).mockResolvedValue([
        { id: 'user-1', firstName: 'John', lastName: 'Doe' },
        { id: 'user-2', firstName: 'Jane', lastName: 'Smith' },
      ]);

      (prisma.match.groupBy as any).mockResolvedValue([]);

      const users = await getMostActiveUsers(10, 30);

      expect(users).toHaveLength(2);
      expect(users[0].messageCount).toBe(100);
    });
  });

  describe('getComplianceReport', () => {
    it('should return compliance metrics', async () => {
      (prisma.report.groupBy as any)
        .mockResolvedValueOnce([
          { reportedUserId: 'user-1' },
          { reportedUserId: 'user-2' },
        ])
        .mockResolvedValueOnce([{ type: 'harassment', _count: 10 }]);

      (prisma.user.count as any)
        .mockResolvedValueOnce(5) // banned
        .mockResolvedValueOnce(3); // suspended

      (prisma.report.count as any)
        .mockResolvedValueOnce(8) // resolved
        .mockResolvedValueOnce(10); // total

      const report = await getComplianceReport(30);

      expect(report.reportedUsers).toBe(2);
      expect(report.bannedUsers).toBe(5);
      expect(report.suspendedUsers).toBe(3);
      expect(report.reportResolutionRate).toBe(80);
    });
  });

  describe('Integration Tests', () => {
    it('should handle dashboard data retrieval', async () => {
      (prisma.user.count as any).mockResolvedValue(1000);
      (prisma.match.count as any).mockResolvedValue(5000);
      (prisma.message.count as any).mockResolvedValue(50000);
      (prisma.report.count as any).mockResolvedValue(100);
      (prisma.subscription.count as any).mockResolvedValue(500);
      (prisma.subscription.groupBy as any).mockResolvedValue([]);

      const stats = await getDashboardStats();

      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('activeSubscriptions');
      expect(stats).toHaveProperty('conversionRate');
    });

    it('should handle user management workflow', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        isVerified: true,
        isBanned: false,
        suspendedUntil: null,
        lastActiveAt: new Date(),
        profileCompleteness: 80,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.match.count as any).mockResolvedValue(5);
      (prisma.report.count as any).mockResolvedValue(2);

      const user = await getUserDetails('user-1');

      expect(user?.totalMatches).toBe(5);
      expect(user?.totalReports).toBe(2);
    });
  });
});
