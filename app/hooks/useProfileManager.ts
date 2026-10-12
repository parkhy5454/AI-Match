import { useState, useCallback } from 'react';
import axios from 'axios';

interface Profile {
  id: string;
  username: string;
  email: string;
  bio?: string;
  age: number;
  gender: string;
  region: string;
  mbti: string;
}

export function useProfileManager() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/profile');
      setProfile(response.data);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '프로필 조회 실패';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<Profile>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put('/api/profile', data);
      setProfile(response.data);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '프로필 업데이트 실패';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
  };
}