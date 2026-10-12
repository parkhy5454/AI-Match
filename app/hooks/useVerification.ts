import { useState, useCallback } from 'react';
import axios from 'axios';

interface VerificationStatus {
  emailVerified: boolean;
  phoneVerified: boolean;
  photoVerified: boolean;
}

export function useVerification() {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVerificationStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/verification/status');
      setStatus(response.data.data);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '검증 상태 조회 실패';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendVerificationEmail = useCallback(async (email: string) => {
    try {
      await axios.post('/api/verification/email', { email });
      return true;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '이메일 전송 실패';
      setError(errorMsg);
      return false;
    }
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    try {
      await axios.post('/api/verification/email/verify', { token });
      setStatus(prev => prev ? { ...prev, emailVerified: true } : null);
      return true;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '이메일 검증 실패';
      setError(errorMsg);
      return false;
    }
  }, []);

  const uploadPhotoVerification = useCallback(async (photoFile: File) => {
    const formData = new FormData();
    formData.append('photo', photoFile);

    try {
      await axios.post('/api/verification/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return true;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '사진 업로드 실패';
      setError(errorMsg);
      return false;
    }
  }, []);

  return {
    status,
    loading,
    error,
    fetchVerificationStatus,
    sendVerificationEmail,
    verifyEmail,
    uploadPhotoVerification,
  };
}