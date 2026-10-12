
'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  progress: number;
  target: number;
  reward: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
}

interface UseAchievementsReturn {
  achievements: Achievement[];
  totalPoints: number;
  loading: boolean;
  error: string | null;
}

export function useAchievements(): UseAchievementsReturn {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        setError(null);
        const response = await axios.get('/api/achievements');
        setAchievements(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch achievements');
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  const totalPoints = achievements.reduce((sum, a) => {
    return sum + (a.isUnlocked ? a.reward : 0);
  }, 0);

  return {
    achievements,
    totalPoints,
    loading,
    error,
  };
}
