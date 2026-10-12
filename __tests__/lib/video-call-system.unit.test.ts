import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db';
import {
  initiateVideoCall,
  respondToCall,
  connectToCall,
  endCall,
  recordCallStatistics,
  getCallStatistics,
  createCallRecording,
  getCallRecordings,
  getCallHistory,
  getCallDetails,
  evaluateCallQuality,
  suggestAdaptiveBitrate,
  getCallStatisticsSummary,
  type VideoCall,
  type CallQualityMetrics,
} from '@/lib/video-call-system';

vi.mock('@/lib/db', () => ({
  prisma: {
    userBlock: {
      findFirst: vi.fn(),
    },
    videoCall: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    callSession: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    callStatistics: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    callRecording: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('Video Call System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initiateVideoCall', () => {
    it('should create a new video call', async () => {
      const mockCall: VideoCall = {
        id: 'call-1',
        initiatorId: 'user-1',
        recipientId: 'user-2',
        status: 'pending',
        callType: 'video',
        startTime: null,
        endTime: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.userBlock.findFirst as any).mockResolvedValue(null);
      (prisma.videoCall.findFirst as any).mockResolvedValue(null);
      (prisma.videoCall.create as any).mockResolvedValue(mockCall);

      const call = await initiateVideoCall('user-1', 'user-2', 'video');

      expect(call.status).toBe('pending');
      expect(call.callType).toBe('video');
    });

    it('should throw error when calling self', async () => {
      await expect(initiateVideoCall('user-1', 'user-1')).rejects.toThrow('Cannot call yourself');
    });

    it('should throw error when users are blocked', async () => {
      (prisma.userBlock.findFirst as any).mockResolvedValue({
        id: 'block-1',
      });

      await expect(initiateVideoCall('user-1', 'user-2')).rejects.toThrow('User has blocked communication');
    });

    it('should throw error when user has active call', async () => {
      (prisma.userBlock.findFirst as any).mockResolvedValue(null);
      (prisma.videoCall.findFirst as any).mockResolvedValue({
        id: 'call-existing',
      });

      await expect(initiateVideoCall('user-1', 'user-2')).rejects.toThrow('User already has an active call');
    });

    it('should create audio call when specified', async () => {
      const mockCall: VideoCall = {
        id: 'call-1',
        initiatorId: 'user-1',
        recipientId: 'user-2',
        status: 'pending',
        callType: 'audio',
        startTime: null,
        endTime: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.userBlock.findFirst as any).mockResolvedValue(null);
      (prisma.videoCall.findFirst as any).mockResolvedValue(null);
      (prisma.videoCall.create as any).mockResolvedValue(mockCall);

      const call = await initiateVideoCall('user-1', 'user-2', 'audio');

      expect(call.callType).toBe('audio');
    });
  });

  describe('respondToCall', () => {
    it('should accept call', async () => {
      const mockCall: VideoCall = {
        id: 'call-1',
        initiatorId: 'user-1',
        recipientId: 'user-2',
        status: 'pending',
        callType: 'video',
        startTime: null,
        endTime: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdated: VideoCall = {
        ...mockCall,
        status: 'ringing',
      };

      (prisma.videoCall.findUnique as any).mockResolvedValue(mockCall);
      (prisma.videoCall.update as any).mockResolvedValue(mockUpdated);

      const call = await respondToCall('call-1', 'user-2', true);

      expect(call.status).toBe('ringing');
    });

    it('should reject call', async () => {
      const mockCall: VideoCall = {
        id: 'call-1',
        initiatorId: 'user-1',
        recipientId: 'user-2',
        status: 'pending',
        callType: 'video',
        startTime: null,
        endTime: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdated: VideoCall = {
        ...mockCall,
        status: 'rejected',
      };

      (prisma.videoCall.findUnique as any).mockResolvedValue(mockCall);
      (prisma.videoCall.update as any).mockResolvedValue(mockUpdated);

      const call = await respondToCall('call-1', 'user-2', false);

      expect(call.status).toBe('rejected');
    });

    it('should throw error when call not found', async () => {
      (prisma.videoCall.findUnique as any).mockResolvedValue(null);

      await expect(respondToCall('nonexistent', 'user-2', true)).rejects.toThrow('Call not found');
    });

    it('should throw error when unauthorized', async () => {
      const mockCall: VideoCall = {
        id: 'call-1',
        initiatorId: 'user-1',
        recipientId: 'user-2',
        status: 'pending',
        callType: 'video',
        startTime: null,
        endTime: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.videoCall.findUnique as any).mockResolvedValue(mockCall);

      await expect(respondToCall('call-1', 'user-3', true)).rejects.toThrow('Unauthorized');
    });
  });

  describe('connectToCall', () => {
    it('should connect to call', async () => {
      const mockCall: VideoCall = {
        id: 'call-1',
        initiatorId: 'user-1',
        recipientId: 'user-2',
        status: 'ringing',
        callType: 'video',
        startTime: null,
        endTime: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.videoCall.findUnique as any).mockResolvedValue(mockCall);
      (prisma.callSession.create as any).mockResolvedValue({
        id: 'session-1',
        callId: 'call-1',
        userId: 'user-2',
        sessionToken: 'token-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (prisma.videoCall.update as any).mockResolvedValue({
        ...mockCall,
        status: 'connected',
        startTime: new Date(),
      });

      const session = await connectToCall('call-1', 'user-2');

      expect(session.sessionToken).toBeDefined();
      expect(session.iceServers).toBeDefined();
    });

    it('should throw error when call not ringing', async () => {
      const mockCall: VideoCall = {
        id: 'call-1',
        initiatorId: 'user-1',
        recipientId: 'user-2',
        status: 'pending',
        callType: 'video',
        startTime: null,
        endTime: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.videoCall.findUnique as any).mockResolvedValue(mockCall);

      await expect(connectToCall('call-1', 'user-2')).rejects.toThrow('Call not in ringing state');
    });
  });

  describe('endCall', () => {
    it('should end call with duration', async () => {
      const startTime = new Date(Date.now() - 60000); // 1 minute ago
      const mockCall: VideoCall = {
        id: 'call-1',
        initiatorId: 'user-1',
        recipientId: 'user-2',
        status: 'connected',
        callType: 'video',
        startTime,
        endTime: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.videoCall.findUnique as any).mockResolvedValue(mockCall);
      (prisma.videoCall.update as any).mockResolvedValue({
        ...mockCall,
        status: 'ended',
        endTime: new Date(),
        duration: 60,
      });

      const call = await endCall('call-1', 'user-1');

      expect(call.status).toBe('ended');
      expect(call.duration).toBe(60);
    });
  });

  describe('recordCallStatistics', () => {
    it('should record call statistics', async () => {
      const metrics: CallQualityMetrics = {
        videoBitrate: 2500,
        audioBitrate: 128,
        frameRate: 30,
        resolution: '720p',
        audioLevel: -20,
        packetLoss: 0.5,
        latency: 50,
        jitter: 10,
      };

      (prisma.callStatistics.create as any).mockResolvedValue({
        id: 'stat-1',
        callId: 'call-1',
        userId: 'user-1',
        ...metrics,
        videoCodec: 'VP9',
        audioCodec: 'OPUS',
        capturedAt: new Date(),
      });

      const stats = await recordCallStatistics('call-1', 'user-1', metrics);

      expect(stats.videoBitrate).toBe(2500);
      expect(stats.frameRate).toBe(30);
    });
  });

  describe('getCallStatistics', () => {
    it('should get call statistics', async () => {
      const mockStats = [
        {
          id: 'stat-1',
          videoBitrate: 2500,
          audioBitrate: 128,
          frameRate: 30,
          capturedAt: new Date(),
        },
      ];

      (prisma.callStatistics.findMany as any).mockResolvedValue(mockStats);

      const stats = await getCallStatistics('call-1');

      expect(stats).toHaveLength(1);
      expect(stats[0].videoBitrate).toBe(2500);
    });
  });

  describe('createCallRecording', () => {
    it('should create call recording', async () => {
      (prisma.callRecording.create as any).mockResolvedValue({
        id: 'rec-1',
        callId: 'call-1',
        fileName: 'call.mp4',
        fileSize: 50000000,
        duration: 3600,
        fileUrl: '/recordings/call-1/call.mp4',
        format: 'mp4',
        bitrate: 2500,
        resolution: '720p',
        createdAt: new Date(),
      });

      const recording = await createCallRecording('call-1', 'call.mp4', 50000000, 3600, 'mp4', 2500, '720p');

      expect(recording.fileName).toBe('call.mp4');
      expect(recording.format).toBe('mp4');
    });
  });

  describe('getCallRecordings', () => {
    it('should get call recordings', async () => {
      const mockRecordings = [
        {
          id: 'rec-1',
          callId: 'call-1',
          fileName: 'call.mp4',
          fileSize: 50000000,
          duration: 3600,
          fileUrl: '/recordings/call-1/call.mp4',
          format: 'mp4',
          bitrate: 2500,
          resolution: '720p',
          createdAt: new Date(),
        },
      ];

      (prisma.callRecording.findMany as any).mockResolvedValue(mockRecordings);

      const recordings = await getCallRecordings('call-1');

      expect(recordings).toHaveLength(1);
      expect(recordings[0].format).toBe('mp4');
    });
  });

  describe('getCallHistory', () => {
    it('should get user call history', async () => {
      const mockCalls = [
        {
          id: 'call-1',
          initiatorId: 'user-1',
          recipientId: 'user-2',
          status: 'ended',
          callType: 'video',
          createdAt: new Date(),
        },
      ];

      (prisma.videoCall.findMany as any).mockResolvedValue(mockCalls);

      const calls = await getCallHistory('user-1', 50, 0);

      expect(calls).toHaveLength(1);
      expect(calls[0].status).toBe('ended');
    });
  });

  describe('evaluateCallQuality', () => {
    it('should rate excellent call quality', () => {
      const metrics = {
        videoBitrate: 3500,
        audioBitrate: 128,
        frameRate: 30,
        resolution: '720p',
        packetLoss: 0.2,
        latency: 50,
        jitter: 10,
        audioLevel: -20,
      };

      const { rating, label } = evaluateCallQuality(metrics as any);

      expect(rating).toBeGreaterThan(85);
      expect(label).toBe('Excellent');
    });

    it('should rate poor call quality', () => {
      const metrics = {
        videoBitrate: 500,
        audioBitrate: 16,
        frameRate: 10,
        resolution: '360p',
        packetLoss: 10,
        latency: 400,
        jitter: 100,
        audioLevel: -80,
      };

      const { rating, label, issues } = evaluateCallQuality(metrics as any);

      expect(rating).toBeLessThan(50);
      expect(label).toBe('Poor');
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe('suggestAdaptiveBitrate', () => {
    it('should reduce bitrate on high packet loss', () => {
      const newBitrate = suggestAdaptiveBitrate(2500, 8, 50);

      expect(newBitrate).toBeLessThan(2500);
    });

    it('should increase bitrate on low packet loss', () => {
      const newBitrate = suggestAdaptiveBitrate(2500, 0.2, 50);

      expect(newBitrate).toBeGreaterThan(2500);
    });

    it('should keep bitrate in range', () => {
      const newBitrate = suggestAdaptiveBitrate(3000, 0.1, 50);

      expect(newBitrate).toBeGreaterThanOrEqual(500);
      expect(newBitrate).toBeLessThanOrEqual(5000);
    });
  });

  describe('getCallStatisticsSummary', () => {
    it('should calculate summary statistics', async () => {
      const mockStats = [
        {
          videoBitrate: 2500,
          audioBitrate: 128,
          frameRate: 30,
          latency: 50,
          jitter: 10,
          packetLoss: 0.5,
        },
        {
          videoBitrate: 2600,
          audioBitrate: 128,
          frameRate: 30,
          latency: 60,
          jitter: 12,
          packetLoss: 0.3,
        },
      ];

      (prisma.callStatistics.findMany as any).mockResolvedValue(mockStats as any);

      const summary = await getCallStatisticsSummary('call-1');

      expect(summary.totalSamples).toBe(2);
      expect(summary.avgVideoBitrate).toBeGreaterThan(0);
      expect(summary.maxPacketLoss).toBe(0.5);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete call workflow', async () => {
      const call: VideoCall = {
        id: 'call-1',
        initiatorId: 'user-1',
        recipientId: 'user-2',
        status: 'pending',
        callType: 'video',
        startTime: null,
        endTime: null,
        duration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.userBlock.findFirst as any).mockResolvedValue(null);
      (prisma.videoCall.findFirst as any).mockResolvedValue(null);
      (prisma.videoCall.create as any).mockResolvedValue(call);

      const initiated = await initiateVideoCall('user-1', 'user-2', 'video');
      expect(initiated.status).toBe('pending');
    });
  });
});
