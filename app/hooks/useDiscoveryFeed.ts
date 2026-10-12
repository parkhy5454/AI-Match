import { useState, useCallback } from 'react';
import axios from 'axios';

interface DiscoveryUser {
  id: string;
  username: string;
  email: string;
  age: number;
  gender?: string;
  region: string;
  mbti: string;
  profileImage?: string;
  bio?: string;
}

export function useDiscoveryFeed() {
  const [users, setUsers] = useState<DiscoveryUser[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendedUsers = useCallback(async (limit = 50, offset = 0) => {
    setLoading(true);
    setError(null);
    try {
      // Search API를 사용하여 추천 사용자 조회
      const response = await axios.get('/api/search', {
        params: { limit, offset },
      });
      const fetchedUsers = response.data.data || [];
      setUsers(fetchedUsers);
      setCurrentIndex(0);
      return fetchedUsers;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '사용자 조회 실패';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const nextUser = useCallback(() => {
    if (currentIndex < users.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (users.length > 0) {
      setCurrentIndex(0);
    }
  }, [currentIndex, users.length]);

  const getCurrentUser = useCallback(() => {
    if (users.length === 0) return null;
    return users[currentIndex];
  }, [users, currentIndex]);

  return {
    users,
    currentIndex,
    loading,
    error,
    fetchRecommendedUsers,
    nextUser,
    getCurrentUser,
  };
}