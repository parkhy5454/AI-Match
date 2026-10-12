
'use client';

import { useState } from 'react';
import VideoCallModal from './VideoCallModal';
import styles from './CallButton.module.css';

interface CallButtonProps {
  recipientId: string;
  recipientName: string;
  recipientImage?: string;
  onCallStart?: (recipientId: string) => Promise<void>;
}

export default function CallButton({
  recipientId,
  recipientName,
  recipientImage,
  onCallStart,
}: CallButtonProps) {
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartCall = async () => {
    setIsLoading(true);
    try {
      if (onCallStart) {
        await onCallStart(recipientId);
      }
      setIsCallOpen(true);
    } catch (error) {
      console.error('Failed to start call:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        className={styles.button}
        onClick={handleStartCall}
        disabled={isLoading}
        title="영상 통화"
      >
        {isLoading ? '연결 중...' : '📹 통화'}
      </button>
      <VideoCallModal
        isOpen={isCallOpen}
        recipientId={recipientId}
        recipientName={recipientName}
        recipientImage={recipientImage}
        isCaller={true}
        onClose={() => setIsCallOpen(false)}
      />
    </>
  );
}
