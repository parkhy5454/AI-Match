import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

interface Notification {
  id: string;
  type: 'like' | 'match' | 'message' | 'system';
  title: string;
  message: string;
  image?: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/notification');
      setNotifications(response.data.data || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '알림 조회 실패';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await axios.put(`/api/notification/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (err) {
      console.error('알림 읽음 표시 실패:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await axios.delete(`/api/notification/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('알림 삭제 실패:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await axios.post('/api/notification/read-all');
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (err) {
      console.error('모두 읽음 표시 실패:', err);
    }
  }, []);

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    deleteNotification,
    markAllAsRead,
  };
}