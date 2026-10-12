import { useState } from 'react';
import axios from 'axios';

interface LikeResult {
  success: boolean;
  data?: any;
  error?: string;
}

export function useLikeSystem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendLike = async (toUserId: string, likeType: 'like' | 'superlike' = 'like'): Promise<LikeResult> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/likes/send', {
        toUserId,
        action: likeType,
      });
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '좋아요 전송 실패';
      setError(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    } finally {
      setLoading(false);
    }
  };

  const sendPass = async (toUserId: string): Promise<LikeResult> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/likes/send', {
        toUserId,
        action: 'pass',
      });
      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '패스 전송 실패';
      setError(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    } finally {
      setLoading(false);
    }
  };

  const checkLike = async (toUserId: string) => {
    try {
      const response = await axios.get('/api/likes/check', {
        params: { toUserId },
      });
      return response.data.data;
    } catch (err: any) {
      console.error('좋아요 확인 실패:', err);
      return null;
    }
  };

  return {
    sendLike,
    sendPass,
    checkLike,
    loading,
    error,
  };
}