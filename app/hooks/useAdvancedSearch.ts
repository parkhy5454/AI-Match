import { useState, useCallback } from 'react';
import axios from 'axios';

interface SearchFilters {
  ageMin?: number;
  ageMax?: number;
  region?: string;
  mbti?: string;
  interests?: string[];
  gender?: string;
  distance?: number;
}

interface SearchResult {
  id: string;
  username: string;
  age: number;
  region: string;
  bio?: string;
  mbti: string;
  imageUrl?: string;
  compatibility?: number;
}

export function useAdvancedSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFilters, setLastFilters] = useState<SearchFilters | null>(null);

  const search = useCallback(async (filters: SearchFilters) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/search', { params: filters });
      setResults(response.data.data);
      setLastFilters(filters);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '검색 실패';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setLastFilters(null);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults,
    lastFilters,
  };
}