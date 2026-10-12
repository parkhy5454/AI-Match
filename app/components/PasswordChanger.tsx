'use client';

import { useState } from 'react';
import axios from 'axios';

interface PasswordChangerProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function PasswordChanger({ onSuccess, onError }: PasswordChangerProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('모든 필드를 입력해주세요');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다');
      return;
    }

    if (newPassword.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다');
      return;
    }

    setLoading(true);

    try {
      await axios.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setSuccess(true);
      if (onSuccess) onSuccess();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '비밀번호 변경 실패';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3 style={styles.title}>비밀번호 변경</h3>

      <div style={styles.formGroup}>
        <label style={styles.label}>현재 비밀번호</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          style={styles.input}
          disabled={loading}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>새 비밀번호</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={styles.input}
          disabled={loading}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>새 비밀번호 확인</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={styles.input}
          disabled={loading}
        />
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>비밀번호가 변경되었습니다</div>}

      <button
        type="submit"
        disabled={loading}
        style={{
          ...styles.button,
          ...(loading ? styles.buttonDisabled : {}),
        }}
      >
        {loading ? '변경 중...' : '비밀번호 변경'}
      </button>
    </form>
  );
}

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    padding: '20px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 16px 0',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  button: {
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  error: {
    padding: '12px 16px',
    background: '#FFE5E5',
    color: '#FF3B30',
    borderRadius: '6px',
    fontSize: '14px',
  },
  success: {
    padding: '12px 16px',
    background: '#E5F5E5',
    color: '#34C759',
    borderRadius: '6px',
    fontSize: '14px',
  },
};