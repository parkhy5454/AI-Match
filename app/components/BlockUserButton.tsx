
'use client';

import { useState } from 'react';
import axios from 'axios';
import styles from './BlockUserButton.module.css';

interface BlockUserButtonProps {
  userId: string;
  isBlocked?: boolean;
  onBlockChange?: (blocked: boolean) => void;
}

export default function BlockUserButton({
  userId,
  isBlocked = false,
  onBlockChange,
}: BlockUserButtonProps) {
  const [blocked, setBlocked] = useState(isBlocked);
  const [loading, setLoading] = useState(false);

  const handleToggleBlock = async () => {
    try {
      setLoading(true);
      if (blocked) {
        await axios.delete(`/api/blocks/${userId}`);
      } else {
        await axios.post('/api/blocks', { blockedUserId: userId });
      }
      setBlocked(!blocked);
      onBlockChange?.(!blocked);
    } catch (error) {
      console.error('Block action error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`${styles.button} ${blocked ? styles.unblock : styles.block}`}
      onClick={handleToggleBlock}
      disabled={loading}
    >
      {loading ? '처리 중...' : blocked ? '차단 해제' : '차단'}
    </button>
  );
}
