'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { useAuth } from '@/app/auth-context';

export default function Login() {
  const router = useRouter();
  const { setTokens } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/login', {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
      });

      if (response.data.success) {
        // AccessToken과 RefreshToken 저장
        const { accessToken, refreshToken } = response.data.data;
        console.log('[Login] 응답 확인:', {
          success: response.data.success,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          accessTokenLength: accessToken?.length,
        });

        if (accessToken && refreshToken) {
          // AuthContext를 통해 토큰 저장 (apiClient 동기화 자동)
          console.log('[Login] 토큰 저장 시작');
          setTokens(accessToken, refreshToken);
          console.log('[Login] 토큰 저장 완료, 대시보드로 이동');

          // 토큰이 저장될 시간 제공
          setTimeout(() => {
            console.log('[Login] router.push 실행');
            router.push('/dashboard');
          }, 100);
        } else {
          console.error('[Login] 토큰 정보 누락:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
          setError('토큰 정보가 없습니다');
        }
      } else {
        console.error('[Login] 로그인 응답 실패:', response.data);
        setError(response.data.error || '로그인에 실패했습니다');
      }
    } catch (err) {
      // 연결 오류 확인
      if (!err.response) {
        if (err.code === 'ERR_CONNECTION_REFUSED' || err.message.includes('Network Error')) {
          setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
          console.error('[Login Error] Connection refused:', err.message);
        } else {
          setError('로그인 중 연결 오류가 발생했습니다.');
          console.error('[Login Error] Network error:', err);
        }
      } else {
        const errorData = err.response?.data;
        const errorMsg = errorData?.error || '로그인에 실패했습니다';
        const remainingMinutes = errorData?.remainingMinutes;
        const remainingAttempts = errorData?.remainingAttempts;

        // 계정 잠금 메시지
        if (remainingMinutes) {
          setError(`${errorMsg} ⏱️ ${remainingMinutes}분 후 다시 시도해주세요.`);
        } else if (remainingAttempts !== undefined && remainingAttempts > 0) {
          setError(`${errorMsg} ⚠️ ${remainingAttempts}회 더 실패하면 계정이 잠금됩니다.`);
        } else {
          setError(errorMsg);
        }

        console.error('[Login Error]', errorData);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>로그인</h1>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="email" style={styles.label}>이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="이메일을 입력하세요"
              style={styles.input}
              disabled={loading}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="password" style={styles.label}>비밀번호</label>
            <div style={styles.passwordInputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="비밀번호를 입력하세요"
                style={styles.input}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.toggleButton}
                disabled={loading}
              >
                {showPassword ? '숨기기' : '보기'}
              </button>
            </div>
            <Link href="/forgot-password" style={styles.forgotLink}>
              비밀번호를 잊으셨나요?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p style={styles.link}>
          계정이 없으신가요? <Link href="/register" style={styles.linkText}>회원가입</Link>
        </p>
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
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '480px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '30px',
    textAlign: 'center',
    color: '#333',
  },
  error: {
    background: '#fee',
    color: '#c33',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #fcc',
    fontSize: '14px',
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
  input: {
    padding: '12px 40px 12px 16px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    width: '100%',
  },
  passwordInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
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
  submitButton: {
    marginTop: '10px',
    padding: '12px 16px',
    fontSize: '16px',
    fontWeight: 'bold',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    transition: 'background 0.2s',
  },
  link: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '14px',
    color: '#666',
  },
  linkText: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: '600',
  },
  forgotLink: {
    fontSize: '12px',
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: '500',
    marginTop: '4px',
    display: 'block',
    textAlign: 'right',
  },
};
