
'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

interface RecommendedUser {
  id: string;
  username: string;
  image: string;
  age: number;
  region: string;
  mbti: string;
  bio: string;
  compatibility: number;
  matchScore: number;
}

interface UseRecommendationsReturn {
  recommendations: RecommendedUser[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRecommendations(): UseRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<RecommendedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    try {
      setError(null);
      const response = await axios.get('/api/recommendations');
      setRecommendations(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  return { recommendations, loading, error, refresh: fetchRecommendations };
}
