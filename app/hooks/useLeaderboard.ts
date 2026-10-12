
'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

interface LeaderboardEntry {
  id: string;
  username: string;
  image?: string;
  badges: number;
  totalPoints: number;
  rank: number;
}

interface UseLeaderboardReturn {
  leaderboard: LeaderboardEntry[];
  userRank?: LeaderboardEntry;
  loading: boolean;
  error: string | null;
}

export function useLeaderboard(): UseLeaderboardReturn {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setError(null);
        const response = await axios.get('/api/leaderboard/badges');
        setLeaderboard(response.data.leaderboard);
        setUserRank(response.data.userRank);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return {
    leaderboard,
    userRank,
    loading,
    error,
  };
}
