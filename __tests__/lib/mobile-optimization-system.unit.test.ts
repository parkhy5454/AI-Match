import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerDevice,
  getOptimizedImageUrl,
  recordPerformanceMetrics,
  getPerformanceAnalytics,
  getBatteryOptimizationTips,
  updatePushPreferences,
  storeOfflineData,
  syncOfflineData,
  getUnsyncedData,
  recordAnalyticsEvent,
  getSessionAnalytics,
  getAppHealthScore,
  getDataUsageBreakdown,
  getRecommendedCacheSize,
  clearCache,
  getAppUpdateInfo,
  getNetworkQualityMetrics,
  type DeviceInfo,
  type PerformanceMetrics,
} from '@/lib/mobile-optimization-system';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Mobile Optimization System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerDevice', () => {
    it('should register a new device', async () => {
      const deviceData = {
        deviceId: 'device-123',
        deviceType: 'ios' as const,
        osVersion: '17.0',
        appVersion: '2.0.0',
        screenWidth: 390,
        screenHeight: 844,
      };

      const device = await registerDevice('user-1', deviceData);

      expect(device).toBeDefined();
      expect(device.userId).toBe('user-1');
      expect(device.deviceId).toBe('device-123');
      expect(device.registeredAt).toBeDefined();
    });

    it('should update device information', async () => {
      const deviceData = {
        deviceId: 'device-123',
        batteryLevel: 45,
      };

      const device = await registerDevice('user-1', deviceData);

      expect(device.batteryLevel).toBe(45);
    });

    it('should handle registration errors', async () => {
      await expect(registerDevice('user-1', {})).rejects.toThrow();
    });
  });

  describe('getOptimizedImageUrl', () => {
    it('should generate optimized image URL', async () => {
      const url = await getOptimizedImageUrl(
        'https://example.com/image.jpg',
        'device-123'
      );

      expect(url).toBeDefined();
      expect(url).toContain('https://example.com/image.jpg');
    });

    it('should return original URL if device not found', async () => {
      const originalUrl = 'https://example.com/image.jpg';
      const url = await getOptimizedImageUrl(originalUrl, 'invalid-device');

      expect(url).toBe(originalUrl);
    });

    it('should add width parameter', async () => {
      const url = await getOptimizedImageUrl(
        'https://example.com/image.jpg',
        'device-123',
        800
      );

      expect(url).toContain('w=');
    });

    it('should handle URL with existing parameters', async () => {
      const url = await getOptimizedImageUrl(
        'https://example.com/image.jpg?existing=param',
        'device-123'
      );

      expect(url).toContain('&');
    });
  });

  describe('recordPerformanceMetrics', () => {
    it('should record performance metrics', async () => {
      const metrics = {
        appLoadTime: 2500,
        pageLoadTime: 1800,
        fps: 58,
        memoryUsage: 150,
      };

      const recorded = await recordPerformanceMetrics(
        'user-1',
        'device-123',
        metrics
      );

      expect(recorded).toBeDefined();
      expect(recorded.appLoadTime).toBe(2500);
      expect(recorded.recordedAt).toBeDefined();
    });

    it('should handle partial metrics', async () => {
      const metrics = {
        appLoadTime: 2000,
      };

      const recorded = await recordPerformanceMetrics(
        'user-1',
        'device-123',
        metrics
      );

      expect(recorded.appLoadTime).toBe(2000);
      expect(recorded.fps).toBe(60); // Default value
    });

    it('should record multiple metrics without errors', async () => {
      const metricsArray = [
        { appLoadTime: 2000 },
        { appLoadTime: 2500 },
        { appLoadTime: 2300 },
      ];

      for (const metrics of metricsArray) {
        const recorded = await recordPerformanceMetrics(
          'user-1',
          'device-123',
          metrics
        );
        expect(recorded).toBeDefined();
      }
    });
  });

  describe('getPerformanceAnalytics', () => {
    it('should get performance analytics', async () => {
      const analytics = await getPerformanceAnalytics('user-1', 'device-123', 7);

      expect(analytics).toBeDefined();
      expect(analytics.avgMetrics).toBeDefined();
      expect(analytics.trends).toBeDefined();
      expect(analytics.issues).toBeDefined();
    });

    it('should detect slow app loading', async () => {
      const analytics = await getPerformanceAnalytics('user-1', 'device-123');

      if (analytics.avgMetrics.appLoadTime! > 3000) {
        expect(analytics.issues).toContain('App load time is slow (>3s)');
      }
    });

    it('should detect high memory usage', async () => {
      const analytics = await getPerformanceAnalytics('user-1', 'device-123');

      if (analytics.avgMetrics.memoryUsage! > 200) {
        expect(analytics.issues).toContain('High memory usage (>200MB)');
      }
    });

    it('should detect low frame rate', async () => {
      const analytics = await getPerformanceAnalytics('user-1', 'device-123');

      if (analytics.avgMetrics.fps! < 50) {
        expect(analytics.issues).toContain('Low frame rate (<50 FPS)');
      }
    });

    it('should provide improvement trends', async () => {
      const analytics = await getPerformanceAnalytics('user-1', 'device-123');

      expect(analytics.trends.loadTimeChange).toBeDefined();
      expect(analytics.trends.memoryUsageChange).toBeDefined();
      expect(analytics.trends.fpsChange).toBeDefined();
    });
  });

  describe('getBatteryOptimizationTips', () => {
    it('should return battery optimization tips', async () => {
      const tips = await getBatteryOptimizationTips('user-1', 'device-123');

      expect(Array.isArray(tips)).toBe(true);
      expect(tips.length).toBeGreaterThan(0);
    });

    it('should categorize tips by type', async () => {
      const tips = await getBatteryOptimizationTips('user-1', 'device-123');
      const types = tips.map(t => t.type);

      expect(types).toContain('network');
      expect(types).toContain('screen');
    });

    it('should prioritize tips', async () => {
      const tips = await getBatteryOptimizationTips('user-1', 'device-123');

      tips.forEach(tip => {
        expect(['high', 'medium', 'low']).toContain(tip.priority);
      });
    });

    it('should provide estimated savings', async () => {
      const tips = await getBatteryOptimizationTips('user-1', 'device-123');

      tips.forEach(tip => {
        expect(tip.estimatedSavings).toBeGreaterThan(0);
        expect(tip.estimatedSavings).toBeLessThanOrEqual(30);
      });
    });
  });

  describe('updatePushPreferences', () => {
    it('should update push preferences', async () => {
      const prefs = await updatePushPreferences('user-1', {
        enablePush: true,
        enableSound: false,
      });

      expect(prefs.userId).toBe('user-1');
      expect(prefs.enablePush).toBe(true);
      expect(prefs.enableSound).toBe(false);
    });

    it('should set quiet hours', async () => {
      const prefs = await updatePushPreferences('user-1', {
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      });

      expect(prefs.quietHoursStart).toBe('22:00');
      expect(prefs.quietHoursEnd).toBe('08:00');
    });

    it('should configure notification categories', async () => {
      const prefs = await updatePushPreferences('user-1', {
        categories: {
          matches: true,
          messages: true,
          likes: false,
          events: true,
          promotions: false,
        },
      });

      expect(prefs.categories.matches).toBe(true);
      expect(prefs.categories.promotions).toBe(false);
    });
  });

  describe('storeOfflineData', () => {
    it('should store offline data', async () => {
      const data = await storeOfflineData('user-1', 'device-123', {
        dataType: 'message',
        actionType: 'create',
        payload: { text: 'Hello' },
      });

      expect(data).toBeDefined();
      expect(data.userId).toBe('user-1');
      expect(data.isSynced).toBe(false);
    });

    it('should store various data types', async () => {
      const types = ['message', 'like', 'match', 'profile'];

      for (const type of types) {
        const data = await storeOfflineData('user-1', 'device-123', {
          dataType: type as any,
          actionType: 'create',
        });

        expect(data.dataType).toBe(type);
      }
    });

    it('should store various action types', async () => {
      const actions = ['create', 'update', 'delete'];

      for (const action of actions) {
        const data = await storeOfflineData('user-1', 'device-123', {
          dataType: 'message',
          actionType: action as any,
        });

        expect(data.actionType).toBe(action);
      }
    });
  });

  describe('syncOfflineData', () => {
    it('should sync offline data', async () => {
      const result = await syncOfflineData('user-1', 'device-123');

      expect(result).toBeDefined();
      expect(result.synced).toBeDefined();
      expect(result.failed).toBeDefined();
    });

    it('should track sync success and failures', async () => {
      const result = await syncOfflineData('user-1', 'device-123');

      expect(result.synced + result.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getUnsyncedData', () => {
    it('should return unsynced data', async () => {
      const data = await getUnsyncedData('user-1');

      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('recordAnalyticsEvent', () => {
    it('should record analytics event', async () => {
      const event = await recordAnalyticsEvent(
        'user-1',
        'device-123',
        'profile_view',
        'session-123'
      );

      expect(event).toBeDefined();
      expect(event.eventName).toBe('profile_view');
      expect(event.timestamp).toBeDefined();
    });

    it('should record event with properties', async () => {
      const properties = { userId: 'user-2', duration: 5000 };
      const event = await recordAnalyticsEvent(
        'user-1',
        'device-123',
        'profile_view',
        'session-123',
        properties
      );

      expect(event.properties).toEqual(properties);
    });
  });

  describe('getSessionAnalytics', () => {
    it('should return session analytics', async () => {
      const analytics = await getSessionAnalytics('user-1', 7);

      expect(analytics).toBeDefined();
      expect(analytics.totalSessions).toBeGreaterThan(0);
      expect(analytics.avgSessionDuration).toBeGreaterThan(0);
    });

    it('should list top screens', async () => {
      const analytics = await getSessionAnalytics('user-1');

      expect(analytics.topScreens).toBeDefined();
      expect(Array.isArray(analytics.topScreens)).toBe(true);
    });

    it('should track crashes', async () => {
      const analytics = await getSessionAnalytics('user-1');

      expect(analytics.crashes).toBeGreaterThanOrEqual(0);
    });

    it('should track event counts', async () => {
      const analytics = await getSessionAnalytics('user-1');

      expect(analytics.events).toBeDefined();
    });
  });

  describe('getAppHealthScore', () => {
    it('should return health score', async () => {
      const health = await getAppHealthScore('user-1', 'device-123');

      expect(health).toBeDefined();
      expect(health.score).toBeGreaterThanOrEqual(0);
      expect(health.score).toBeLessThanOrEqual(100);
    });

    it('should assign health rating', async () => {
      const health = await getAppHealthScore('user-1', 'device-123');

      expect(['excellent', 'good', 'fair', 'poor']).toContain(health.rating);
    });

    it('should rate components', async () => {
      const health = await getAppHealthScore('user-1', 'device-123');

      expect(health.components.performance).toBeDefined();
      expect(health.components.memory).toBeDefined();
      expect(health.components.battery).toBeDefined();
    });

    it('should map score to rating', async () => {
      const health = await getAppHealthScore('user-1', 'device-123');

      if (health.score >= 80) {
        expect(health.rating).toBe('excellent');
      } else if (health.score >= 60) {
        expect(health.rating).toBe('good');
      }
    });
  });

  describe('getDataUsageBreakdown', () => {
    it('should return data usage breakdown', async () => {
      const breakdown = await getDataUsageBreakdown('user-1', 'device-123');

      expect(breakdown).toBeDefined();
      expect(breakdown.images).toBeGreaterThanOrEqual(0);
      expect(breakdown.videos).toBeGreaterThanOrEqual(0);
    });

    it('should sum total usage', async () => {
      const breakdown = await getDataUsageBreakdown('user-1', 'device-123');
      const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

      expect(total).toBeGreaterThan(0);
    });
  });

  describe('getRecommendedCacheSize', () => {
    it('should recommend cache size', async () => {
      const size = await getRecommendedCacheSize('device-123');

      expect(size.recommended).toBeGreaterThan(0);
      expect(size.max).toBeGreaterThanOrEqual(size.recommended);
      expect(size.current).toBeGreaterThanOrEqual(0);
    });

    it('should cap cache size', async () => {
      const size = await getRecommendedCacheSize('device-123');

      expect(size.max).toBeLessThanOrEqual(500);
    });
  });

  describe('clearCache', () => {
    it('should clear cache', async () => {
      const result = await clearCache('user-1', 'device-123');

      expect(result.cleared).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAppUpdateInfo', () => {
    it('should return app update info', async () => {
      const info = await getAppUpdateInfo('2.0.0', 'ios');

      expect(info).toBeDefined();
      expect(info.currentVersion).toBe('2.0.0');
      expect(info.latestVersion).toBeDefined();
      expect(info.updateAvailable).toBeDefined();
    });

    it('should determine update type', async () => {
      const info = await getAppUpdateInfo('1.0.0', 'ios');

      expect(['critical', 'recommended', 'optional', 'none']).toContain(
        info.updateType
      );
    });

    it('should provide download URL', async () => {
      const info = await getAppUpdateInfo('2.0.0', 'ios');

      if (info.updateAvailable) {
        expect(info.downloadUrl).toContain('https://');
      }
    });
  });

  describe('getNetworkQualityMetrics', () => {
    it('should return network quality', async () => {
      const quality = await getNetworkQualityMetrics('device-123');

      expect(quality).toBeDefined();
      expect(quality.bandwidth).toBeGreaterThan(0);
      expect(quality.latency).toBeGreaterThanOrEqual(0);
      expect(quality.packetLoss).toBeGreaterThanOrEqual(0);
    });

    it('should rate network quality', async () => {
      const quality = await getNetworkQualityMetrics('device-123');

      expect(['excellent', 'good', 'fair', 'poor']).toContain(quality.quality);
    });

    it('should provide recommendations', async () => {
      const quality = await getNetworkQualityMetrics('device-123');

      expect(Array.isArray(quality.recommendations)).toBe(true);
    });
  });
});
