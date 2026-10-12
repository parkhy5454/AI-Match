'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import { useAuth } from '@/app/auth-context';
import PasswordPolicyValidator from '@/components/PasswordPolicyValidator';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens } = useAuth();

  // 3단계: 이메일 검증 → OTP 입력 → 회원정보 입력
  const [step, setStep] = useState('email'); // 'email', 'otp', 'info'

  const [formData, setFormData] = useState({
    email: '',
    otpCode: '',
    username: '',
    password: '',
    gender: '',
    referralCode: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  // URL에서 추천 코드 읽기
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setFormData(prev => ({
        ...prev,
        referralCode: refCode,
      }));
    }
  }, [searchParams]);

  // OTP 타이머 관리
  useEffect(() => {
    if (otpTimer <= 0) return;

    const interval = setInterval(() => {
      setOtpTimer(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [otpTimer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  // Step 1: 이메일 & OTP 발송
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const email = formData.email.toLowerCase().trim();

      if (!email) {
        setError('이메일을 입력해주세요');
        setLoading(false);
        return;
      }

      const response = await axios.post('/api/auth/otp/send', {
        email,
        type: 'signup',
      });

      if (response.data.success) {
        setSuccess('인증 코드가 이메일로 발송되었습니다');
        setOtpSent(true);
        setOtpTimer(600); // 10분
        setStep('otp');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'OTP 발송에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: OTP 검증
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { otpCode, email } = formData;

      if (!otpCode || otpCode.length !== 6) {
        setError('인증 코드는 6자리 숫자여야 합니다');
        setLoading(false);
        return;
      }

      const response = await axios.post('/api/auth/otp/verify', {
        email,
        code: otpCode,
        type: 'signup',
      });

      if (response.data.success) {
        setSuccess('이메일 인증 완료! 회원정보를 입력해주세요');
        setStep('info');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'OTP 검증에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: 회원정보 입력 & 회원가입
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/register', {
        email: formData.email.toLowerCase().trim(),
        username: formData.username.trim(),
        password: formData.password,
        gender: formData.gender,
        referralCode: formData.referralCode || null,
      });

      if (response.data.success) {
        const { accessToken, refreshToken } = response.data.data;
        if (accessToken && refreshToken) {
          setTokens(accessToken, refreshToken);
          setSuccess('회원가입 성공! 대시보드로 이동합니다');
          setTimeout(() => router.push('/dashboard'), 1000);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || '회원가입에 실패했습니다');
      console.error('[Register Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 'otp') {
      setStep('email');
      setOtpSent(false);
      setOtpTimer(0);
      setFormData(prev => ({ ...prev, otpCode: '' }));
    } else if (step === 'info') {
      setStep('otp');
      setFormData(prev => ({ ...prev, otpCode: '' }));
    }
    setError('');
    setSuccess('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>회원가입</h1>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {/* Step 1: 이메일 입력 & OTP 발송 */}
        {step === 'email' && (
          <form onSubmit={handleSendOTP} style={{ ...styles.form, margin: 0 }}>
            <div style={styles.stepIndicator}>1단계: 이메일 인증</div>

            <div style={styles.formGroup}>
              <label htmlFor="email" style={styles.label}>
                이메일
              </label>
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

            <button
              type="submit"
              disabled={loading || !formData.email}
              style={{
                ...styles.submitButton,
                opacity: loading || !formData.email ? 0.6 : 1,
                cursor: loading || !formData.email ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '발송 중...' : 'OTP 발송'}
            </button>
          </form>
        )}

        {/* Step 2: OTP 입력 */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} style={{ ...styles.form, margin: 0 }}>
            <div style={styles.stepIndicator}>2단계: OTP 인증</div>

            <div style={styles.formGroup}>
              <label htmlFor="email" style={styles.label}>
                이메일
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                style={{ ...styles.input, backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                disabled
              />
              <p style={styles.hint}>이메일을 변경하려면 뒤로 가기를 클릭하세요</p>
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="otpCode" style={styles.label}>
                인증 코드 (6자리)
              </label>
              <input
                type="text"
                id="otpCode"
                name="otpCode"
                value={formData.otpCode}
                onChange={handleChange}
                placeholder="000000"
                style={styles.input}
                maxLength="6"
                disabled={loading}
                required
              />
              <p style={styles.timerText}>
                {otpTimer > 0
                  ? `코드 유효시간: ${Math.floor(otpTimer / 60)}:${String(otpTimer % 60).padStart(2, '0')}`
                  : '코드 유효시간 만료'}
              </p>
            </div>

            <div style={styles.buttonGroup}>
              <button
                type="button"
                onClick={goBack}
                style={styles.backButton}
                disabled={loading}
              >
                ← 뒤로 가기
              </button>
              <button
                type="submit"
                disabled={loading || formData.otpCode.length !== 6}
                style={{
                  ...styles.submitButton,
                  opacity: loading || formData.otpCode.length !== 6 ? 0.6 : 1,
                  cursor: loading || formData.otpCode.length !== 6 ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? '검증 중...' : '인증 확인'}
              </button>
            </div>

            {otpSent && otpTimer <= 0 && (
              <button
                type="button"
                onClick={handleSendOTP}
                style={styles.resendButton}
                disabled={loading}
              >
                코드 재발송
              </button>
            )}
          </form>
        )}

        {/* Step 3: 회원정보 입력 */}
        {step === 'info' && (
          <form onSubmit={handleRegister} style={{ ...styles.form, margin: 0 }}>
            <div style={styles.stepIndicator}>3단계: 회원정보 입력</div>

            <div style={styles.formGroup}>
              <label htmlFor="email" style={styles.label}>
                이메일
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                style={{ ...styles.input, backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                disabled
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="username" style={styles.label}>
                사용자명
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="사용자명을 입력하세요"
                style={styles.input}
                disabled={loading}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="password" style={styles.label}>
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="비밀번호를 입력하세요"
                style={styles.input}
                disabled={loading}
                required
              />
              <PasswordPolicyValidator password={formData.password} onChange={handleChange} />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="gender" style={styles.label}>
                성별
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                style={styles.input}
                disabled={loading}
                required
              >
                <option value="">성별을 선택하세요</option>
                <option value="남성">남성</option>
                <option value="여성">여성</option>
                <option value="기타">기타</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="referralCode" style={styles.label}>
                추천 코드 (선택사항)
              </label>
              <input
                type="text"
                id="referralCode"
                name="referralCode"
                value={formData.referralCode}
                onChange={handleChange}
                placeholder="추천 코드를 입력하세요"
                style={styles.input}
                disabled={loading}
              />
              {formData.referralCode && (
                <p style={styles.referralHint}>✅ 추천 코드: {formData.referralCode}</p>
              )}
            </div>

            <div style={styles.buttonGroup}>
              <button
                type="button"
                onClick={goBack}
                style={styles.backButton}
                disabled={loading}
              >
                ← 뒤로 가기
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.submitButton,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? '가입 중...' : '회원가입'}
              </button>
            </div>
          </form>
        )}

        <p style={styles.link}>
          이미 계정이 있으신가요? <Link href="/login" style={styles.linkText}>로그인</Link>
        </p>
      </div>
    </div>
  );
}

export default function Register() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          로딩 중...
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
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
  stepIndicator: {
    background: '#667eea',
    color: 'white',
    padding: '10px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
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
  success: {
    background: '#efe',
    color: '#3c3',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #cfc',
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
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: '12px',
    color: '#999',
    marginTop: '4px',
  },
  timerText: {
    fontSize: '12px',
    color: '#e74c3c',
    marginTop: '4px',
    fontWeight: '500',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
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
    cursor: 'pointer',
  },
  backButton: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '16px',
    fontWeight: 'bold',
    background: '#ddd',
    color: '#333',
    border: 'none',
    borderRadius: '8px',
    transition: 'background 0.2s',
    cursor: 'pointer',
  },
  resendButton: {
    marginTop: '10px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    background: 'transparent',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
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
  referralHint: {
    fontSize: '12px',
    color: '#28a745',
    marginTop: '8px',
    marginBottom: '0',
    fontWeight: '500',
  },
};
