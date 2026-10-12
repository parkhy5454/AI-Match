/**
 * WebRTC Utilities for Audio/Video Calls
 * Handles peer connection setup, ICE candidates, and media streams
 */

export interface RTCConfig {
  iceServers: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
}

export interface CallState {
  callId: string;
  status: 'pending' | 'connecting' | 'active' | 'ended';
  callType: 'audio' | 'video';
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  peerConnection?: RTCPeerConnection;
  startTime?: Date;
}

export const DEFAULT_RTC_CONFIG: RTCConfig = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    { urls: ['stun:stun1.l.google.com:19302'] },
    { urls: ['stun:stun2.l.google.com:19302'] },
  ],
};

/**
 * WebRTC 피어 연결 생성
 */
export async function createPeerConnection(
  config: RTCConfig = DEFAULT_RTC_CONFIG
): Promise<RTCPeerConnection> {
  const peerConnection = new RTCPeerConnection({
    iceServers: config.iceServers,
  });

  return peerConnection;
}

/**
 * 로컬 미디어 스트림 가져오기
 */
export async function getLocalStream(
  constraints: MediaStreamConstraints = {
    audio: true,
    video: { width: 1280, height: 720 },
  }
): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    console.error('[WebRTC] 미디어 스트림 획득 실패:', error);
    throw error;
  }
}

/**
 * 오디오 전용 스트림 가져오기
 */
export async function getAudioOnlyStream(): Promise<MediaStream> {
  return getLocalStream({
    audio: true,
    video: false,
  });
}

/**
 * 비디오 스트림 가져오기
 */
export async function getVideoStream(): Promise<MediaStream> {
  return getLocalStream({
    audio: true,
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });
}

/**
 * 미디어 스트림 중지
 */
export function stopMediaStream(stream?: MediaStream): void {
  if (!stream) return;

  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

/**
 * 피어 연결에 미디어 트랙 추가
 */
export function addTracksToConnection(
  peerConnection: RTCPeerConnection,
  stream: MediaStream
): void {
  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream);
  });
}

/**
 * 피어 연결 종료
 */
export function closePeerConnection(peerConnection?: RTCPeerConnection): void {
  if (!peerConnection) return;

  // 모든 senders 종료
  peerConnection.getSenders().forEach((sender) => {
    sender.track?.stop();
  });

  // 연결 종료
  peerConnection.close();
}

/**
 * 원격 스트림 처리
 */
export function handleRemoteStream(
  peerConnection: RTCPeerConnection,
  onRemoteStream: (stream: MediaStream) => void
): void {
  peerConnection.ontrack = (event: RTCTrackEvent) => {
    console.log('[WebRTC] 원격 트랙 수신:', event.track.kind);
    if (event.streams && event.streams.length > 0) {
      onRemoteStream(event.streams[0]);
    }
  };
}

/**
 * ICE 연결 상태 모니터링
 */
export function monitorConnectionState(
  peerConnection: RTCPeerConnection,
  onStateChange: (state: RTCIceConnectionState) => void
): void {
  peerConnection.oniceconnectionstatechange = () => {
    console.log('[WebRTC] ICE 연결 상태:', peerConnection.iceConnectionState);
    onStateChange(peerConnection.iceConnectionState);
  };

  peerConnection.onconnectionstatechange = () => {
    console.log('[WebRTC] 피어 연결 상태:', peerConnection.connectionState);
  };
}

/**
 * 통화 품질 통계 가져오기
 */
export async function getCallStats(
  peerConnection: RTCPeerConnection
): Promise<RTCStatsReport> {
  return peerConnection.getStats();
}

/**
 * 통화 품질 분석
 */
export async function analyzeCallQuality(
  peerConnection: RTCPeerConnection
): Promise<{
  audioPacketsLost: number;
  videoBitrate: number;
  audioBitrate: number;
  videoFramerate: number;
  rtt: number; // Round Trip Time
}> {
  const stats = await getCallStats(peerConnection);
  const report = {
    audioPacketsLost: 0,
    videoBitrate: 0,
    audioBitrate: 0,
    videoFramerate: 0,
    rtt: 0,
  };

  stats.forEach((report: any) => {
    if (report.type === 'inbound-rtp') {
      if (report.mediaType === 'audio') {
        report.audioPacketsLost = report.packetsLost || 0;
      } else if (report.mediaType === 'video') {
        report.videoBitrate = report.bytesReceived || 0;
        report.videoFramerate = report.framesDecoded || 0;
      }
    } else if (report.type === 'outbound-rtp') {
      if (report.mediaType === 'audio') {
        report.audioBitrate = report.bytesSent || 0;
      }
    } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      report.rtt = report.currentRoundTripTime || 0;
    }
  });

  return report;
}
