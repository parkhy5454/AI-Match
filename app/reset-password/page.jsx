'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import PasswordPolicyValidator from '@/components/PasswordPolicyValidator';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError('유효하지 않은 링크입니다.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!newPassword || !confirmPassword) {
      setError('모든 필드를 입력해주세요.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/reset-password', {
        token,
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });

      if (response.data.success) {
        setSuccess('비밀번호가 성공적으로 변경되었습니다! 2초 후 로그인 페이지로 이동합니다.');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err) {
      let errorMsg = '비밀번호 변경 중 오류가 발생했습니다.';

      // 연결 오류 확인
      if (!err.response) {
        if (err.code === 'ERR_CONNECTION_REFUSED' || err.message.includes('Network Error')) {
          errorMsg = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
          console.error('[Reset Password Error] Connection refused:', err.message);
        } else {
          errorMsg = '비밀번호 변경 중 연결 오류가 발생했습니다.';
          console.error('[Reset Password Error] Network error:', err);
        }
      } else {
        errorMsg = err.response?.data?.error || '비밀번호 변경 중 오류가 발생했습니다.';
        console.error('[Reset Password Error]', err.response?.data);
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#c33',
                margin: '0 0 16px 0',
              }}
            >
              유효하지 않은 링크
            </h1>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다.
            </p>
            <Link
              href="/forgot-password"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#667eea',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: '600',
              }}
            >
              다시 요청하기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* 비밀번호 재설정 카드 */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            padding: '32px',
          }}
        >
          {/* 제목 */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#111',
                margin: '0',
              }}
            >
              비밀번호 재설정
            </h1>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} style={{ space: '16px' }}>
            {/* 새 비밀번호 입력 */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333',
                  marginBottom: '8px',
                }}
              >
                새 비밀번호
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호를 입력하세요"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border 0.2s',
                  backgroundColor: 'white',
                  color: '#333',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#667eea')}
                onBlur={(e) => (e.target.style.borderColor = '#ddd')}
                disabled={loading}
                required
              />
              <PasswordPolicyValidator password={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>

            {/* 비밀번호 확인 입력 */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#333',
                  marginBottom: '8px',
                }}
              >
                비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border 0.2s',
                  backgroundColor: 'white',
                  color: '#333',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#667eea')}
                onBlur={(e) => (e.target.style.borderColor = '#ddd')}
                disabled={loading}
                required
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div
                style={{
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  color: '#c33',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '16px',
                }}
              >
                {error}
              </div>
            )}

            {/* 성공 메시지 */}
            {success && (
              <div
                style={{
                  backgroundColor: '#efe',
                  border: '1px solid #cfc',
                  color: '#3c3',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  marginBottom: '16px',
                }}
              >
                {success}
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={loading || success}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#667eea',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                transition: 'background 0.2s',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading || success ? 0.6 : 1,
              }}
              onMouseOver={(e) =>
                !loading && !success && (e.target.style.backgroundColor = '#5568d3')
              }
              onMouseOut={(e) => (e.target.style.backgroundColor = '#667eea')}
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>

          {/* 로그인 링크 */}
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <p style={{ color: '#666', fontSize: '14px', margin: '0' }}>
              이미 기억하셨어요?{' '}
              <Link
                href="/login"
                style={{
                  color: '#667eea',
                  textDecoration: 'none',
                  fontWeight: '600',
                }}
              >
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ color: 'white', textAlign: 'center' }}>
        <p>로딩 중...</p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
