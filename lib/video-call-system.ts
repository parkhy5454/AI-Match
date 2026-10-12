import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export type CallStatus = 'pending' | 'ringing' | 'connected' | 'disconnected' | 'missed' | 'rejected' | 'ended';
export type CallType = 'video' | 'audio';
export type RecordingFormat = 'mp4' | 'webm' | 'mkv';

export interface VideoCall {
  id: string;
  initiatorId: string;
  recipientId: string;
  status: CallStatus;
  callType: CallType;
  startTime: Date | null;
  endTime: Date | null;
  duration: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CallSession {
  id: string;
  callId: string;
  userId: string;
  sessionToken: string;
  iceServers: Array<{ urls: string[]; username?: string; credential?: string }>;
  sdpOffer: string | null;
  sdpAnswer: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CallStatistics {
  id: string;
  callId: string;
  userId: string;
  videoBitrate: number;
  audioBitrate: number;
  frameRate: number;
  resolution: string;
  packetLoss: number;
  latency: number;
  jitter: number;
  audioLevel: number;
  videoCodec: string;
  audioCodec: string;
  capturedAt: Date;
}

export interface CallRecording {
  id: string;
  callId: string;
  fileName: string;
  fileSize: number;
  duration: number;
  fileUrl: string;
  format: RecordingFormat;
  bitrate: number;
  resolution: string;
  createdAt: Date;
}

export interface CallQualityMetrics {
  videoBitrate: number;
  audioBitrate: number;
  frameRate: number;
  resolution: string;
  audioLevel: number;
  packetLoss: number;
  latency: number;
  jitter: number;
}

/**
 * Get ICE servers for WebRTC
 */
function getIceServers(): CallSession['iceServers'] {
  return [
    {
      urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
    },
    {
      urls: ['turn:turn.example.com:3478'],
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_PASSWORD,
    },
  ];
}

/**
 * Initiate a video call
 */
export async function initiateVideoCall(
  initiatorId: string,
  recipientId: string,
  callType: CallType = 'video'
): Promise<VideoCall> {
  if (initiatorId === recipientId) {
    throw new Error('Cannot call yourself');
  }

  // Check if users are blocked
  const isBlocked = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: initiatorId, blockedId: recipientId, status: 'active' },
        { blockerId: recipientId, blockedId: initiatorId, status: 'active' },
      ],
    },
  });

  if (isBlocked) {
    throw new Error('User has blocked communication');
  }

  // Check for active calls
  const activeCall = await prisma.videoCall.findFirst({
    where: {
      OR: [
        { initiatorId, status: { in: ['pending', 'ringing', 'connected'] } },
        { recipientId: initiatorId, status: { in: ['pending', 'ringing', 'connected'] } },
      ],
    },
  });

  if (activeCall) {
    throw new Error('User already has an active call');
  }

  // Create video call
  const call = await prisma.videoCall.create({
    data: {
      initiatorId,
      recipientId,
      status: 'pending',
      callType,
    },
  });

  return call;
}

/**
 * Respond to call (accept or reject)
 */
export async function respondToCall(
  callId: string,
  userId: string,
  accepted: boolean
): Promise<VideoCall> {
  const call = await prisma.videoCall.findUnique({
    where: { id: callId },
  });

  if (!call) {
    throw new Error('Call not found');
  }

  if (call.recipientId !== userId) {
    throw new Error('Unauthorized');
  }

  if (call.status !== 'pending') {
    throw new Error('Call already responded');
  }

  const newStatus: CallStatus = accepted ? 'ringing' : 'rejected';

  const updatedCall = await prisma.videoCall.update({
    where: { id: callId },
    data: { status: newStatus },
  });

  return updatedCall;
}

/**
 * Connect to call (establish connection)
 */
export async function connectToCall(
  callId: string,
  userId: string
): Promise<CallSession> {
  const call = await prisma.videoCall.findUnique({
    where: { id: callId },
  });

  if (!call) {
    throw new Error('Call not found');
  }

  if (call.status !== 'ringing') {
    throw new Error('Call not in ringing state');
  }

  if (call.recipientId !== userId && call.initiatorId !== userId) {
    throw new Error('Unauthorized');
  }

  // Create session
  const sessionToken = uuidv4();
  const iceServers = getIceServers();

  const session = await prisma.callSession.create({
    data: {
      callId,
      userId,
      sessionToken,
      iceServersData: iceServers,
    },
  });

  // Update call status
  await prisma.videoCall.update({
    where: { id: callId },
    data: {
      status: 'connected',
      startTime: new Date(),
    },
  });

  return {
    id: session.id,
    callId: session.callId,
    userId: session.userId,
    sessionToken: session.sessionToken,
    iceServers: iceServers,
    sdpOffer: null,
    sdpAnswer: null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

/**
 * End a call
 */
export async function endCall(callId: string, userId: string): Promise<VideoCall> {
  const call = await prisma.videoCall.findUnique({
    where: { id: callId },
  });

  if (!call) {
    throw new Error('Call not found');
  }

  if (call.initiatorId !== userId && call.recipientId !== userId) {
    throw new Error('Unauthorized');
  }

  const endTime = new Date();
  const duration = call.startTime ? Math.floor((endTime.getTime() - call.startTime.getTime()) / 1000) : null;

  const updatedCall = await prisma.videoCall.update({
    where: { id: callId },
    data: {
      status: 'ended',
      endTime,
      duration,
    },
  });

  return updatedCall;
}

/**
 * Record call statistics
 */
export async function recordCallStatistics(
  callId: string,
  userId: string,
  metrics: CallQualityMetrics
): Promise<CallStatistics> {
  const stats = await prisma.callStatistics.create({
    data: {
      callId,
      userId,
      videoBitrate: metrics.videoBitrate,
      audioBitrate: metrics.audioBitrate,
      frameRate: metrics.frameRate,
      resolution: metrics.resolution,
      packetLoss: metrics.packetLoss,
      latency: metrics.latency,
      jitter: metrics.jitter,
      audioLevel: metrics.audioLevel,
      videoCodec: 'VP9',
      audioCodec: 'OPUS',
    },
  });

  return stats;
}

/**
 * Get call statistics
 */
export async function getCallStatistics(
  callId: string,
  limit: number = 100
): Promise<CallStatistics[]> {
  return prisma.callStatistics.findMany({
    where: { callId },
    orderBy: { capturedAt: 'desc' },
    take: limit,
  });
}

/**
 * Create call recording
 */
export async function createCallRecording(
  callId: string,
  fileName: string,
  fileSize: number,
  duration: number,
  format: RecordingFormat,
  bitrate: number,
  resolution: string
): Promise<CallRecording> {
  const fileUrl = `/recordings/${callId}/${fileName}`;

  const recording = await prisma.callRecording.create({
    data: {
      callId,
      fileName,
      fileSize,
      duration,
      fileUrl,
      format,
      bitrate,
      resolution,
    },
  });

  return recording;
}

/**
 * Get call recordings
 */
export async function getCallRecordings(callId: string): Promise<CallRecording[]> {
  return prisma.callRecording.findMany({
    where: { callId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get call history
 */
export async function getCallHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<VideoCall[]> {
  return prisma.videoCall.findMany({
    where: {
      OR: [{ initiatorId: userId }, { recipientId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * Get call details
 */
export async function getCallDetails(callId: string): Promise<VideoCall | null> {
  return prisma.videoCall.findUnique({
    where: { id: callId },
  });
}

/**
 * Calculate call quality rating
 */
export function evaluateCallQuality(metrics: CallQualityMetrics): {
  rating: number;
  label: string;
  issues: string[];
} {
  let rating = 100;
  const issues: string[] = [];

  // Video bitrate check (target 2500-4000 kbps for 720p)
  if (metrics.videoBitrate < 1500) {
    rating -= 25;
    issues.push('Low video bitrate');
  } else if (metrics.videoBitrate < 2500) {
    rating -= 10;
  }

  // Audio bitrate check (target 64-128 kbps)
  if (metrics.audioBitrate < 32) {
    rating -= 15;
    issues.push('Low audio bitrate');
  }

  // Frame rate check (target 24-30 fps)
  if (metrics.frameRate < 15) {
    rating -= 20;
    issues.push('Low frame rate');
  }

  // Packet loss check (target < 1%)
  if (metrics.packetLoss > 5) {
    rating -= 30;
    issues.push('High packet loss');
  } else if (metrics.packetLoss > 2) {
    rating -= 15;
  }

  // Latency check (target < 150ms)
  if (metrics.latency > 300) {
    rating -= 20;
    issues.push('High latency');
  } else if (metrics.latency > 150) {
    rating -= 10;
  }

  // Jitter check (target < 30ms)
  if (metrics.jitter > 50) {
    rating -= 15;
    issues.push('High jitter');
  }

  rating = Math.max(0, Math.min(100, rating));

  let label: string;
  if (rating >= 85) {
    label = 'Excellent';
  } else if (rating >= 70) {
    label = 'Good';
  } else if (rating >= 50) {
    label = 'Fair';
  } else {
    label = 'Poor';
  }

  return { rating, label, issues };
}

/**
 * Suggest adaptive bitrate based on metrics
 */
export function suggestAdaptiveBitrate(
  currentBitrate: number,
  packetLoss: number,
  latency: number
): number {
  let newBitrate = currentBitrate;

  // If packet loss is high, reduce bitrate
  if (packetLoss > 5) {
    newBitrate = Math.floor(currentBitrate * 0.7); // Reduce by 30%
  } else if (packetLoss > 2) {
    newBitrate = Math.floor(currentBitrate * 0.85); // Reduce by 15%
  } else if (packetLoss < 0.5) {
    // If quality is good, can increase bitrate
    newBitrate = Math.floor(Math.min(currentBitrate * 1.2, 5000)); // Increase by 20%, max 5000 kbps
  }

  // Consider latency
  if (latency > 200) {
    newBitrate = Math.floor(newBitrate * 0.9);
  }

  return Math.max(500, Math.min(5000, newBitrate)); // Keep between 500-5000 kbps
}

/**
 * Get call statistics summary
 */
export async function getCallStatisticsSummary(callId: string): Promise<{
  avgVideoBitrate: number;
  avgAudioBitrate: number;
  avgFrameRate: number;
  avgLatency: number;
  avgJitter: number;
  maxPacketLoss: number;
  totalSamples: number;
}> {
  const stats = await prisma.callStatistics.findMany({
    where: { callId },
  });

  if (stats.length === 0) {
    return {
      avgVideoBitrate: 0,
      avgAudioBitrate: 0,
      avgFrameRate: 0,
      avgLatency: 0,
      avgJitter: 0,
      maxPacketLoss: 0,
      totalSamples: 0,
    };
  }

  return {
    avgVideoBitrate: Math.round(stats.reduce((sum, s) => sum + s.videoBitrate, 0) / stats.length),
    avgAudioBitrate: Math.round(stats.reduce((sum, s) => sum + s.audioBitrate, 0) / stats.length),
    avgFrameRate: Math.round(stats.reduce((sum, s) => sum + s.frameRate, 0) / stats.length),
    avgLatency: Math.round(stats.reduce((sum, s) => sum + s.latency, 0) / stats.length),
    avgJitter: Math.round(stats.reduce((sum, s) => sum + s.jitter, 0) / stats.length),
    maxPacketLoss: Math.max(...stats.map((s) => s.packetLoss)),
    totalSamples: stats.length,
  };
}

/**
 * Connect to an ongoing call
 */
export async function connectCall(callId: string, userId: string): Promise<CallSession | null> {
  return connectToCall(callId, userId);
}

/**
 * Start call recording
 */
export async function startRecording(callId: string): Promise<CallRecording> {
  return createCallRecording(callId, 'webm');
}

/**
 * Stop call recording
 */
export async function stopRecording(callId: string): Promise<void> {
  // Mark recording as stopped in database
  const recording = await prisma.callRecording.findFirst({
    where: { callId, status: 'active' }
  });

  if (recording) {
    await prisma.callRecording.update({
      where: { id: recording.id },
      data: {
        status: 'completed',
        endedAt: new Date()
      }
    });
  }
}

/**
 * Get adaptive bitrate recommendation
 */
export function getAdaptiveBitrate(metrics: CallQualityMetrics): {
  videoBitrate: number;
  audioBitrate: number;
  recommendation: 'increase' | 'maintain' | 'decrease';
} {
  return suggestAdaptiveBitrate(metrics);
}

/**
 * Get call summary statistics
 */
export async function getCallSummaryStats(callId: string): Promise<{
  duration: number;
  avgQuality: number;
  participantCount: number;
  recordingAvailable: boolean;
}> {
  const call = await prisma.videoCall.findUnique({
    where: { id: callId }
  });

  const recordings = await prisma.callRecording.findMany({
    where: { callId }
  });

  const sessionCount = await prisma.callSession.count({
    where: { callId }
  });

  if (!call) {
    return {
      duration: 0,
      avgQuality: 0,
      participantCount: 0,
      recordingAvailable: false
    };
  }

  const duration = call.endedAt && call.startedAt
    ? Math.floor((call.endedAt.getTime() - call.startedAt.getTime()) / 1000)
    : 0;

  return {
    duration,
    avgQuality: 85, // Placeholder
    participantCount: sessionCount,
    recordingAvailable: recordings.length > 0 && recordings[0].status === 'completed'
  };
}
