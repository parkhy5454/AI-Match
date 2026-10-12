import { useState, useCallback } from 'react';
import axios from 'axios';

interface UserSettings {
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  privateProfile: boolean;
  showOnlineStatus: boolean;
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/settings');
      setSettings(response.data.data);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '설정 조회 실패';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put('/api/settings', newSettings);
      setSettings(response.data.data);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '설정 업데이트 실패';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
  };
}