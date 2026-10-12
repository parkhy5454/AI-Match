
'use client';

import { useRef, useState } from 'react';

interface UseScreenShareReturn {
  isScreenSharing: boolean;
  screenStream: MediaStream | null;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  error: string | null;
}

export function useScreenShare(): UseScreenShareReturn {
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startScreenShare = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      // Handle stop event
      stream.getTracks()[0].addEventListener('ended', stopScreenShare);
    } catch (err) {
      if (err instanceof Error && err.name !== 'NotAllowedError') {
        setError(err.message);
      }
    }
  };

  const stopScreenShare = async () => {
    try {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop screen share');
    }
  };

  return {
    isScreenSharing,
    screenStream: screenStreamRef.current,
    startScreenShare,
    stopScreenShare,
    error,
  };
}
