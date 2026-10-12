import { useState, useCallback } from 'react';
import axios from 'axios';

interface LikeStatistics {
  totalLikesReceived: number;
  totalLikesSent: number;
  totalSuperLikes: number;
  totalMatches: number;
  likeRatio: number;
}

interface DailyLikeInfo {
  remainingLikes: number;
  remainingSuperLikes: number;
  resetTime: string;
  isPremium: boolean;
}

export function useLikeStats() {
  const [stats, setStats] = useState<LikeStatistics | null>(null);
  const [dailyInfo, setDailyInfo] = useState<DailyLikeInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/likes/statistics', {
        params: { type: 'general' },
      });
      setStats(response.data.data);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '통계 조회 실패';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDailyInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/likes/statistics', {
        params: { type: 'daily' },
      });
      setDailyInfo(response.data.data);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '일일 정보 조회 실패';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    dailyInfo,
    loading,
    error,
    fetchStats,
    fetchDailyInfo,
  };
}