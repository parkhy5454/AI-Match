import { useState, useCallback } from 'react';
import axios from 'axios';

interface Match {
  id: string;
  userId: string;
  username: string;
  email: string;
  profileImage?: string;
  age: number;
  region: string;
  mbti: string;
  createdAt: string;
}

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async (limit = 20, offset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/matches', {
        params: { limit, offset },
      });
      setMatches(response.data.data || []);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '매칭 조회 실패';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const unmatch = async (matchId: string) => {
    try {
      const response = await axios.delete('/api/matches', {
        data: { matchId },
      });
      setMatches(matches.filter(m => m.id !== matchId));
      return response.data.success;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '매칭 해제 실패';
      setError(errorMsg);
      return false;
    }
  };

  return {
    matches,
    loading,
    error,
    fetchMatches,
    unmatch,
  };
}