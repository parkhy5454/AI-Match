import { useState, useCallback } from 'react';
import axios from 'axios';

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  likeNotifications: boolean;
  matchNotifications: boolean;
  messageNotifications: boolean;
  systemNotifications: boolean;
  notificationFrequency: 'instant' | 'daily' | 'weekly';
}

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/notification/preferences');
      setPreferences(response.data.data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '설정 조회 실패';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    setLoading(true);
    try {
      const response = await axios.put('/api/notification/preferences', newPreferences);
      setPreferences(response.data.data);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '설정 저장 실패';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    preferences,
    loading,
    error,
    fetchPreferences,
    updatePreferences,
  };
}