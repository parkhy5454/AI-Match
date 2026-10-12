import { useState, useCallback } from 'react';
import axios from 'axios';

interface SavedSearch {
  id: string;
  name: string;
  filters: Record<string, any>;
  createdAt: string;
}

export function useSavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedSearches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/search/saved');
      setSearches(response.data.data || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '저장된 검색 조회 실패';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSearch = useCallback(async (name: string, filters: Record<string, any>) => {
    try {
      const response = await axios.post('/api/search/saved', { name, filters });
      setSearches(prev => [...prev, response.data.data]);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '검색 저장 실패';
      setError(errorMsg);
      return null;
    }
  }, []);

  const deleteSearch = useCallback(async (searchId: string) => {
    try {
      await axios.delete(`/api/search/saved/${searchId}`);
      setSearches(prev => prev.filter(s => s.id !== searchId));
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '검색 삭제 실패';
      setError(errorMsg);
    }
  }, []);

  return {
    searches,
    loading,
    error,
    fetchSavedSearches,
    saveSearch,
    deleteSearch,
  };
}