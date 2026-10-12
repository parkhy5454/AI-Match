'use client';

import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await axios.post('/api/forgot-password', {
        email: email.toLowerCase().trim(),
      });

      if (response.data.ok) {
        setSuccess('비밀번호 재설정 링크가 이메일로 발송되었습니다!');
        setEmail('');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || '요청 중 오류가 발생했습니다.';
      setError(errorMsg);
      console.error('[Forgot Password Error]', errorMsg);
    } finally {
      setLoading(false);
    }
  };

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
        {/* 비밀번호 찾기 카드 */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            padding: '32px',
            space: '24px',
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
              비밀번호 찾기
            </h1>
          </div>

          {/* 안내 텍스트 */}
          <p
            style={{
              textAlign: 'center',
              color: '#666',
              fontSize: '14px',
              marginBottom: '24px',
            }}
          >
            등록된 이메일을 입력하면 비밀번호 재설정 링크가 전송됩니다.
          </p>

          {/* 폼 */}
          <form onSubmit={handleSubmit} style={{ space: '16px' }}>
            {/* 이메일 입력 */}
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
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
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
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#667eea',
                hover: '#5568d3',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                transition: 'background 0.2s',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#5568d3')}
              onMouseOut={(e) => (e.target.style.backgroundColor = '#667eea')}
            >
              {loading ? '요청 중...' : '링크 발송'}
            </button>
          </form>

          {/* 로그인 링크 */}
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <p style={{ color: '#666', fontSize: '14px', margin: '0' }}>
              로그인하시겠어요?{' '}
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
