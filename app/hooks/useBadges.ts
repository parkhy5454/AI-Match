
'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
  isLocked: boolean;
}

interface UseBadgesReturn {
  badges: Badge[];
  totalBadges: number;
  unlockedBadges: number;
  loading: boolean;
  error: string | null;
}

export function useBadges(): UseBadgesReturn {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        setError(null);
        const response = await axios.get('/api/badges');
        setBadges(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch badges');
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, []);

  const unlockedBadges = badges.filter((b) => !b.isLocked).length;

  return {
    badges,
    totalBadges: badges.length,
    unlockedBadges,
    loading,
    error,
  };
}
