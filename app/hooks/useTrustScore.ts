import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface TrustScore {
  score: number;
  level: 'critical' | 'low' | 'medium' | 'high';
  verified: boolean;
}

export function useTrustScore(userId?: string) {
  const { data: session } = useSession();
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrustScore = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/trust-score?userId=${id}`);
      if (!response.ok) throw new Error('Failed to fetch trust score');
      const data = await response.json();
      setTrustScore(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = userId || session?.user?.id;
    if (id) {
      fetchTrustScore(id);
    }
  }, [userId, session]);

  return { trustScore, loading, error };
}
