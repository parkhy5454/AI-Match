import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/search/history');
      setHistory(response.data.data || []);
    } catch (err) {
      console.error('검색 이력 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addToHistory = useCallback(async (query: string) => {
    try {
      await axios.post('/api/search/history', { query });
      setHistory(prev => [query, ...prev].slice(0, 10));
    } catch (err) {
      console.error('검색 이력 추가 실패:', err);
    }
  }, []);

  const deleteFromHistory = useCallback(async (query: string) => {
    try {
      await axios.delete(`/api/search/history?query=${encodeURIComponent(query)}`);
      setHistory(prev => prev.filter(item => item !== query));
    } catch (err) {
      console.error('검색 이력 삭제 실패:', err);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, []);

  return {
    history,
    loading,
    fetchHistory,
    addToHistory,
    deleteFromHistory,
  };
}