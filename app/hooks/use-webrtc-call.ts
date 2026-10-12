/**
 * useWebRTCCall - Hook for managing WebRTC audio/video calls
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '@/app/socket-context';
import {
  createPeerConnection,
  getLocalStream,
  getAudioOnlyStream,
  getVideoStream,
  stopMediaStream,
  addTracksToConnection,
  closePeerConnection,
  handleRemoteStream,
  monitorConnectionState,
  DEFAULT_RTC_CONFIG,
} from '@/lib/webrtc-utils';

export interface UseWebRTCCallOptions {
  callId: string;
  callType: 'audio' | 'video';
  remoteUserId: string;
  isInitiator: boolean;
}

export function useWebRTCCall(options: UseWebRTCCallOptions) {
  const { socket } = useSocket();
  const {
    callId,
    callType,
    remoteUserId,
    isInitiator,
  } = options;

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCIceConnectionState>('new');
  const [callStatus, setCallStatus] = useState<'connecting' | 'active' | 'ended'>('connecting');
  const [error, setError] = useState<string | null>(null);

  // 로컬 미디어 스트림 가져오기
  const initializeLocalStream = useCallback(async () => {
    try {
      let stream: MediaStream;

      if (callType === 'audio') {
        stream = await getAudioOnlyStream();
      } else {
        stream = await getVideoStream();
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get media stream';
      setError(message);
      console.error('[WebRTC] Error getting local stream:', err);
      throw err;
    }
  }, [callType]);

  // 피어 연결 생성
  const initializePeerConnection = useCallback(async (stream: MediaStream) => {
    try {
      const pc = await createPeerConnection(DEFAULT_RTC_CONFIG);
      peerConnectionRef.current = pc;

      // 로컬 트랙 추가
      addTracksToConnection(pc, stream);

      // 원격 스트림 처리
      handleRemoteStream(pc, (remoteStream) => {
        remoteStreamRef.current = remoteStream;
        setRemoteStream(remoteStream);
      });

      // 연결 상태 모니터링
      monitorConnectionState(pc, (state) => {
        setConnectionState(state);
        if (state === 'connected' || state === 'completed') {
          setCallStatus('active');
        }
      });

      // ICE Candidate 처리
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('webrtc:ice-candidate', {
            recipientId: remoteUserId,
            candidate: event.candidate,
            callId,
          });
        }
      };

      return pc;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create peer connection';
      setError(message);
      console.error('[WebRTC] Error creating peer connection:', err);
      throw err;
    }
  }, [socket, remoteUserId, callId]);

  // 통화 시작 (발신자)
  const startCall = useCallback(async () => {
    try {
      setError(null);

      // 1. 로컬 스트림 가져오기
      const stream = await initializeLocalStream();

      // 2. 피어 연결 생성
      const pc = await initializePeerConnection(stream);

      // 3. Offer 생성 및 전송
      if (isInitiator) {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === 'video',
        });

        await pc.setLocalDescription(offer);

        if (socket) {
          socket.emit('webrtc:offer', {
            recipientId: remoteUserId,
            offer: offer,
            callId,
          });
        }
      }
    } catch (err) {
      console.error('[WebRTC] Error starting call:', err);
      setError(err instanceof Error ? err.message : 'Failed to start call');
    }
  }, [callId, callType, isInitiator, remoteUserId, initializeLocalStream, initializePeerConnection, socket]);

  // Socket 이벤트 리스너 설정
  useEffect(() => {
    if (!socket) return;

    // Offer 수신
    const handleOffer = async (data: any) => {
      try {
        if (data.callId !== callId) return;

        const stream = await initializeLocalStream();
        const pc = await initializePeerConnection(stream);

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc:answer', {
          recipientId: data.callerId,
          answer: answer,
          callId,
        });
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err);
        setError(err instanceof Error ? err.message : 'Failed to handle offer');
      }
    };

    // Answer 수신
    const handleAnswer = async (data: any) => {
      try {
        if (data.callId !== callId || !peerConnectionRef.current) return;

        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      } catch (err) {
        console.error('[WebRTC] Error handling answer:', err);
        setError(err instanceof Error ? err.message : 'Failed to handle answer');
      }
    };

    // ICE Candidate 수신
    const handleIceCandidate = async (data: any) => {
      try {
        if (data.callId !== callId || !peerConnectionRef.current) return;

        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      } catch (err) {
        console.error('[WebRTC] Error adding ICE candidate:', err);
        // Don't set error for ICE candidates as they can fail sometimes
      }
    };

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
    };
  }, [socket, callId, initializeLocalStream, initializePeerConnection]);

  // 통화 종료
  const endCall = useCallback(() => {
    if (peerConnectionRef.current) {
      closePeerConnection(peerConnectionRef.current);
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      stopMediaStream(localStreamRef.current);
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('ended');
  }, []);

  // 정리
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    // State
    localStream,
    remoteStream,
    connectionState,
    callStatus,
    error,

    // Methods
    startCall,
    endCall,
  };
}
