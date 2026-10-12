'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { useAuth } from '@/app/auth-context';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { accessToken, hydrated, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // 인증 확인 및 리다이렉트
  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      setError('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  }, [hydrated, isAuthenticated, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // 클라이언트 측 검증
      if (
        !formData.currentPassword ||
        !formData.newPassword ||
        !formData.confirmPassword
      ) {
        setError('모든 필드를 입력해주세요');
        setLoading(false);
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setError('새 비밀번호가 일치하지 않습니다');
        setLoading(false);
        return;
      }

      if (formData.currentPassword === formData.newPassword) {
        setError('새 비밀번호는 현재 비밀번호와 달라야 합니다');
        setLoading(false);
        return;
      }

      if (formData.newPassword.length < 8) {
        setError('새 비밀번호는 최소 8자 이상이어야 합니다');
        setLoading(false);
        return;
      }

      // AuthContext에서 토큰 확인
      if (!accessToken) {
        setError('인증 토큰을 찾을 수 없습니다. 다시 로그인해주세요.');
        setLoading(false);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
        return;
      }

      console.log('[Change Password] 토큰 상태:', {
        tokenExists: !!accessToken,
        tokenLength: accessToken?.length,
        tokenPrefix: accessToken?.substring(0, 20),
      });

      // API 요청 - accessToken을 Authorization 헤더로 포함
      const response = await axios.post('/api/auth/change-password', {
        currentPassword: formData.currentPassword.trim(),
        newPassword: formData.newPassword.trim(),
        confirmPassword: formData.confirmPassword.trim(),
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[Change Password] 성공 응답:', response.data);

      if (response.data.success) {
        setSuccess(
          '비밀번호가 성공적으로 변경되었습니다. 2초 후 설정 페이지로 이동합니다.'
        );
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });

        setTimeout(() => {
          router.push('/settings');
        }, 2000);
      }
    } catch (err) {
      console.error('[Change Password Error] 전체 에러:', err);

      // 연결 오류 처리
      if (!err.response) {
        if (
          err.code === 'ERR_CONNECTION_REFUSED' ||
          err.message.includes('Network Error')
        ) {
          setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
          console.error('[Change Password Error] Connection refused:', err.message);
        } else {
          setError('비밀번호 변경 중 연결 오류가 발생했습니다.');
          console.error('[Change Password Error] Network error:', err);
        }
      } else {
        // 401 Unauthorized 처리
        if (err.response?.status === 401) {
          setError('인증이 만료되었습니다. 다시 로그인해주세요.');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        } else {
          setError(
            err.response?.data?.error ||
              '비밀번호 변경 중 오류가 발생했습니다.'
          );
        }
        console.error('[Change Password Error] 응답 데이터:', err.response?.data);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <h1 style={styles.title}>비밀번호 변경</h1>
            <p style={styles.subtitle}>로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <h1 style={styles.title}>비밀번호 변경</h1>
            <p style={styles.subtitle}>로그인이 필요합니다</p>
          </div>
          <div style={styles.error}>
            {error || '로그인 페이지로 이동합니다...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>비밀번호 변경</h1>
          <p style={styles.subtitle}>
            계정의 비밀번호를 안전하게 변경하세요
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* 현재 비밀번호 */}
          <div style={styles.formGroup}>
            <label style={styles.label}>현재 비밀번호</label>
            <div style={styles.passwordInputWrapper}>
              <input
                type={showPasswords.current ? 'text' : 'password'}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="현재 비밀번호를 입력하세요"
                style={styles.input}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                style={styles.toggleButton}
                disabled={loading}
              >
                {showPasswords.current ? '숨기기' : '보기'}
              </button>
            </div>
          </div>

          {/* 새 비밀번호 */}
          <div style={styles.formGroup}>
            <label style={styles.label}>새 비밀번호</label>
            <div style={styles.passwordInputWrapper}>
              <input
                type={showPasswords.new ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="새 비밀번호를 입력하세요"
                style={styles.input}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                style={styles.toggleButton}
                disabled={loading}
              >
                {showPasswords.new ? '숨기기' : '보기'}
              </button>
            </div>
            <div style={styles.hint}>
              ℹ️ 최소 8자, 대문자, 소문자, 숫자, 특수문자 포함
            </div>
          </div>

          {/* 비밀번호 확인 */}
          <div style={styles.formGroup}>
            <label style={styles.label}>새 비밀번호 확인</label>
            <div style={styles.passwordInputWrapper}>
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="새 비밀번호를 다시 입력하세요"
                style={styles.input}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                style={styles.toggleButton}
                disabled={loading}
              >
                {showPasswords.confirm ? '숨기기' : '보기'}
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && <div style={styles.error}>{error}</div>}

          {/* 성공 메시지 */}
          {success && <div style={styles.success}>{success}</div>}

          {/* 버튼 */}
          <div style={styles.buttonGroup}>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
            <Link href="/settings" style={styles.cancelButton}>
              취소
            </Link>
          </div>
        </form>

        {/* 보안 팁 */}
        <div style={styles.tips}>
          <h3 style={styles.tipsTitle}>보안 팁</h3>
          <ul style={styles.tipsList}>
            <li>정기적으로 비밀번호를 변경하세요</li>
            <li>다른 사이트와 같은 비밀번호를 사용하지 마세요</li>
            <li>
              개인정보(생년월일, 전화번호 등)를 포함한 비밀번호는 피하세요
            </li>
            <li>비밀번호를 다른 사람과 공유하지 마세요</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '480px',
    padding: '40px',
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  passwordInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '12px 40px 12px 16px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  toggleButton: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#667eea',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '4px 8px',
    fontWeight: '500',
  },
  hint: {
    fontSize: '12px',
    color: '#999',
    marginTop: '4px',
  },
  error: {
    background: '#fee',
    color: '#c33',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #fcc',
    fontSize: '14px',
  },
  success: {
    background: '#efe',
    color: '#3c3',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #cfc',
    fontSize: '14px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '10px',
  },
  submitButton: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '16px',
    fontWeight: 'bold',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    transition: 'background 0.2s',
  },
  cancelButton: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '16px',
    fontWeight: 'bold',
    background: '#e0e0e0',
    color: '#333',
    border: 'none',
    borderRadius: '8px',
    textDecoration: 'none',
    textAlign: 'center',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tips: {
    marginTop: '30px',
    padding: '20px',
    background: '#f5f5f5',
    borderRadius: '8px',
    borderLeft: '4px solid #667eea',
  },
  tipsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 12px 0',
  },
  tipsList: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
    paddingLeft: '20px',
  },
};
