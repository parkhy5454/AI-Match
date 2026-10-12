'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useWebRTCCall } from '@/app/hooks/use-webrtc-call';

interface VideoCallModalProps {
  callId: string;
  remoteUserName: string;
  remoteUserImage?: string;
  callType: 'audio' | 'video';
  isInitiator: boolean;
  remoteUserId: string;
  onCallEnded: () => void;
  onCallAccepted?: () => void;
  onCallRejected?: () => void;
}

export function VideoCallModal({
  callId,
  remoteUserName,
  remoteUserImage,
  callType,
  isInitiator,
  remoteUserId,
  onCallEnded,
  onCallAccepted,
  onCallRejected,
}: VideoCallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [callStarted, setCallStarted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const {
    localStream,
    remoteStream,
    connectionState,
    callStatus,
    error,
    startCall,
    endCall,
  } = useWebRTCCall({
    callId,
    callType,
    remoteUserId,
    isInitiator,
  });

  // 로컬 스트림을 비디오 요소에 연결
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // 원격 스트림을 비디오 요소에 연결
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // 통화 시간 측정
  useEffect(() => {
    if (callStatus !== 'active') return;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStatus]);

  // 통화 종료
  const handleEndCall = () => {
    endCall();
    onCallEnded();
  };

  // 통화 수락 (발신자 아닐 때)
  const handleAcceptCall = async () => {
    try {
      setCallStarted(true);
      await startCall();
      onCallAccepted?.();
    } catch (err) {
      console.error('Failed to accept call:', err);
    }
  };

  // 통화 거절
  const handleRejectCall = () => {
    endCall();
    onCallRejected?.();
  };

  // 포맷팅 함수
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.modal}>
      <div style={styles.container}>
        {/* 원격 비디오 (메인) */}
        {callType === 'video' && (
          <div style={styles.remoteVideoContainer}>
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={styles.remoteVideo}
              />
            ) : (
              <div style={styles.videoPlaceholder}>
                {remoteUserImage && (
                  <img
                    src={remoteUserImage}
                    alt={remoteUserName}
                    style={styles.userImage}
                  />
                )}
                <p style={styles.placeholderText}>{remoteUserName}</p>
              </div>
            )}
          </div>
        )}

        {/* 로컬 비디오 (PIP) */}
        {callType === 'video' && localStream && (
          <div style={styles.localVideoContainer}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={styles.localVideo}
            />
          </div>
        )}

        {/* 오디오 전용 UI */}
        {callType === 'audio' && (
          <div style={styles.audioContainer}>
            <div style={styles.audioContent}>
              {remoteUserImage && (
                <img
                  src={remoteUserImage}
                  alt={remoteUserName}
                  style={styles.audioUserImage}
                />
              )}
              <h2 style={styles.userName}>{remoteUserName}</h2>
              <p style={styles.callStatus}>
                {callStatus === 'connecting' ? '연결 중...' : '통화 중'}
              </p>
              {callStatus === 'active' && (
                <p style={styles.callDuration}>{formatTime(callDuration)}</p>
              )}
            </div>
          </div>
        )}

        {/* 컨트롤 버튼 */}
        <div style={styles.controls}>
          {!callStarted && !isInitiator ? (
            <>
              <button
                onClick={handleAcceptCall}
                style={styles.acceptButton}
              >
                수락
              </button>
              <button
                onClick={handleRejectCall}
                style={styles.rejectButton}
              >
                거절
              </button>
            </>
          ) : (
            <button
              onClick={handleEndCall}
              style={styles.endButton}
            >
              종료
            </button>
          )}
        </div>

        {/* 상태 표시 */}
        <div style={styles.statusBar}>
          <span style={styles.statusText}>
            상태: {callStatus === 'active' ? '활성' : '연결 중'}
          </span>
          {error && (
            <span style={styles.errorText}>{error}</span>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  container: {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  remoteVideoContainer: {
    flex: 1,
    position: 'relative' as const,
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  videoPlaceholder: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  userImage: {
    width: 120,
    height: 120,
    borderRadius: '50%',
    objectFit: 'cover' as const,
    marginBottom: 20,
  },
  placeholderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  localVideoContainer: {
    position: 'absolute' as const,
    bottom: 100,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    border: '2px solid #667eea',
  },
  localVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    transform: 'scaleX(-1)',
  },
  audioContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioContent: {
    textAlign: 'center' as const,
  },
  audioUserImage: {
    width: 120,
    height: 120,
    borderRadius: '50%',
    objectFit: 'cover' as const,
    marginBottom: 30,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    margin: '0 0 10px 0',
  },
  callStatus: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    margin: '0 0 20px 0',
  },
  callDuration: {
    color: '#667eea',
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: 20,
    padding: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  acceptButton: {
    padding: '12px 32px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  rejectButton: {
    padding: '12px 32px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  endButton: {
    padding: '12px 32px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
  },
};
