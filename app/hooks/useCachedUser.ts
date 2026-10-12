import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface CachedUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  mbti?: string;
  age?: number;
  region?: string;
}

export function useCachedUser() {
  const { data: session } = useSession();
  const [user, setUser] = useState<CachedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!session?.user?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/users/me');
      if (!response.ok) throw new Error('Failed to fetch user');
      const data = await response.json();
      setUser(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { user, loading, error, refetch: fetchUser };
}
