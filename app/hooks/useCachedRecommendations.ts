import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface Recommendation {
  id: string;
  name: string;
  image: string;
  matchScore: number;
  mbti?: string;
  age?: number;
}

export function useCachedRecommendations() {
  const { data: session } = useSession();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.email) return;

    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/recommendations?cached=true');
        if (!response.ok) throw new Error('Failed to fetch recommendations');
        const data = await response.json();
        setRecommendations(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
    const interval = setInterval(fetchRecommendations, 1800000); // 30 minutes

    return () => clearInterval(interval);
  }, [session]);

  return { recommendations, loading, error };
}
