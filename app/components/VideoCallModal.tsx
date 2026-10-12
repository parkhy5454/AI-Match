
'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './VideoCallModal.module.css';

interface VideoCallModalProps {
  isOpen: boolean;
  recipientId: string;
  recipientName: string;
  recipientImage?: string;
  onClose: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  isIncoming?: boolean;
  isCaller?: boolean;
}

export default function VideoCallModal({
  isOpen,
  recipientId,
  recipientName,
  recipientImage,
  onClose,
  onAccept,
  onReject,
  isIncoming = false,
  isCaller = false,
}: VideoCallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connecting' | 'active' | 'ended'>(
    isIncoming ? 'ringing' : 'connecting'
  );

  useEffect(() => {
    if (!isOpen) return;

    // Initialize local video stream
    const getLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Failed to get local stream:', error);
      }
    };

    getLocalStream();
  }, [isOpen]);

  useEffect(() => {
    if (callStatus !== 'active') return;

    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        {callStatus === 'ringing' && isIncoming && (
          <div className={styles.incomingCall}>
            {recipientImage && (
              <img src={recipientImage} alt={recipientName} className={styles.recipientImage} />
            )}
            <h2>{recipientName}</h2>
            <p>영상 통화 중...</p>
            <div className={styles.actions}>
              <button className={styles.acceptBtn} onClick={onAccept}>
                ✓
              </button>
              <button className={styles.rejectBtn} onClick={onReject}>
                ✕
              </button>
            </div>
          </div>
        )}

        {callStatus === 'connecting' && isCaller && (
          <div className={styles.connecting}>
            {recipientImage && (
              <img src={recipientImage} alt={recipientName} className={styles.recipientImage} />
            )}
            <h2>{recipientName}</h2>
            <p>연결 중...</p>
            <div className={styles.loader}></div>
          </div>
        )}

        {(callStatus === 'active' || callStatus === 'connecting') && (
          <div className={styles.videoContainer}>
            <div className={styles.remoteVideo}>
              <video ref={remoteVideoRef} autoPlay playsInline />
              <div className={styles.label}>{recipientName}</div>
            </div>

            <div className={styles.localVideo}>
              <video ref={localVideoRef} autoPlay playsInline muted />
            </div>

            <div className={styles.header}>
              <span className={styles.duration}>{formatDuration(callDuration)}</span>
            </div>

            <div className={styles.controls}>
              <button
                className={`${styles.controlBtn} ${isMuted ? styles.active : ''}`}
                onClick={() => setIsMuted(!isMuted)}
                title={isMuted ? '음소거 해제' : '음소거'}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <button
                className={`${styles.controlBtn} ${!isVideoOn ? styles.active : ''}`}
                onClick={() => setIsVideoOn(!isVideoOn)}
                title={isVideoOn ? '카메라 끔' : '카메라 켬'}
              >
                {isVideoOn ? '📹' : '📹‍X'}
              </button>
              <button
                className={`${styles.controlBtn} ${styles.endBtn}`}
                onClick={onClose}
                title="통화 종료"
              >
                📞
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
