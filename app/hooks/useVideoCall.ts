
'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

interface VideoCallState {
  recipientId: string;
  recipientName: string;
  status: 'idle' | 'ringing' | 'connecting' | 'active' | 'ended';
  duration: number;
  isMuted: boolean;
  isVideoOn: boolean;
}

interface UseVideoCallReturn {
  callState: VideoCallState | null;
  startCall: (recipientId: string, recipientName: string) => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  rejectCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  error: string | null;
  loading: boolean;
}

export function useVideoCall(): UseVideoCallReturn {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [callState, setCallState] = useState<VideoCallState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const startCall = async (recipientId: string, recipientName: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get local stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      localStreamRef.current = stream;

      // Initialize peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Create and set offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send call signal to recipient
      await axios.post('/api/calling/initiate', {
        recipientId,
        sdp: offer.sdp,
      });

      setCallState({
        recipientId,
        recipientName,
        status: 'ringing',
        duration: 0,
        isMuted: false,
        isVideoOn: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start call');
    } finally {
      setLoading(false);
    }
  };

  const acceptCall = async (callId: string) => {
    try {
      setLoading(true);

      // Get local stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      localStreamRef.current = stream;

      // Initialize peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      peerConnectionRef.current = peerConnection;

      // Add local stream
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Accept call
      await axios.post(`/api/calling/${callId}/accept`);

      if (callState) {
        setCallState({ ...callState, status: 'active' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept call');
    } finally {
      setLoading(false);
    }
  };

  const rejectCall = async (callId: string) => {
    try {
      await axios.post(`/api/calling/${callId}/reject`);
      setCallState(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject call');
    }
  };

  const endCall = async () => {
    try {
      if (callState) {
        await axios.post('/api/calling/end', { callId: callState.recipientId });
      }

      // Cleanup
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      setCallState(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end call');
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });

      setCallState((prev) => {
        if (!prev) return null;
        return { ...prev, isMuted: !prev.isMuted };
      });
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });

      setCallState((prev) => {
        if (!prev) return null;
        return { ...prev, isVideoOn: !prev.isVideoOn };
      });
    }
  };

  return {
    callState,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    error,
    loading,
  };
}
