
'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

interface BlockedUser {
  id: string;
  username: string;
  blockedAt: Date;
}

interface UseBlocksReturn {
  blockedUsers: BlockedUser[];
  isUserBlocked: (userId: string) => boolean;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useBlocks(): UseBlocksReturn {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBlocks();
  }, []);

  const fetchBlocks = async () => {
    try {
      const response = await axios.get('/api/blocks');
      setBlockedUsers(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch blocks');
    } finally {
      setLoading(false);
    }
  };

  const isUserBlocked = (userId: string) => {
    return blockedUsers.some((u) => u.id === userId);
  };

  const blockUser = async (userId: string) => {
    await axios.post('/api/blocks', { blockedUserId: userId });
    await fetchBlocks();
  };

  const unblockUser = async (userId: string) => {
    await axios.delete(`/api/blocks/${userId}`);
    await fetchBlocks();
  };

  return { blockedUsers, isUserBlocked, blockUser, unblockUser, loading, error };
}
