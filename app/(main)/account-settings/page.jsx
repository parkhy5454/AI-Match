'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function AccountSettingsPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    age: '',
    gender: '',
    region: '',
    mbti: '',
    bio: '',
  });

  const REGIONS = [
    '서울', '경기', '인천', '대전', '세종', '충북', '충남',
    '전북', '전남', '광주', '대구', '경북', '경남', '부산', '울산', '제주'
  ];

  const MBTI_TYPES = [
    'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
    'ISTP', 'ISFP', 'INFP', 'INTP',
    'ESTP', 'ESFP', 'ENFP', 'ENTP',
    'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'
  ];

  useEffect(() => {
    if (!hydrated) {
      console.log('[AccountSettings] AuthContext 하이드레이션 대기 중...');
      return;
    }

    fetchUserData();
  }, [hydrated]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('[AccountSettings] API 요청: /api/profile');
      const response = await axios.get('/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = response.data;
      setUser(userData);
      setFormData({
        username: userData.username || '',
        age: userData.age || '',
        gender: userData.gender || '',
        region: userData.region || '',
        mbti: userData.mbti || '',
        bio: userData.bio || '',
      });
      console.log('[AccountSettings] 사용자 데이터 로드 성공');
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('[AccountSettings] 인증 실패, 로그인 페이지로 이동');
        router.push('/login');
      } else {
        const errorMsg = err.response?.data?.error || '사용자 정보 로드에 실패했습니다';
        setError(errorMsg);
        console.error('[AccountSettings] API 에러:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('[AccountSettings] API 요청: /api/profile');
      const response = await axios.post('/api/profile', {
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        region: formData.region || null,
        mbti: formData.mbti || null,
        bio: formData.bio.trim() || null,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('[AccountSettings] 프로필 업데이트 성공');
      setSuccess('계정 설정이 저장되었습니다');
      setUser(response.data);

      // 3초 후 성공 메시지 자동 사라지기
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || '저장에 실패했습니다';
      setError(errorMsg);
      console.error('[AccountSettings] 저장 에러:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    router.push('/account-settings/change-password');
  };

  if (loading) {
    return (
      <>
        <TopNav />
        <div style={styles.container}>
          <div style={styles.loadingSpinner}>로딩 중...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav />
      <div style={styles.container}>
        {/* 페이지 제목 */}
        <div style={styles.pageHeader}>
          <Link href="/dashboard" style={styles.backLink}>
            ← 뒤로 가기
          </Link>
          <h1 style={styles.title}>👤 계정 설정</h1>
          <p style={styles.subtitle}>프로필 정보를 수정하세요</p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p style={{ margin: 0 }}>⚠️ {error}</p>
          </div>
        )}

        {success && (
          <div style={styles.successCard}>
            <p style={{ margin: 0 }}>✅ {success}</p>
          </div>
        )}

        {/* 계정 정보 카드 */}
        <div style={styles.infoCard}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>이메일</span>
            <span style={styles.infoValue}>{user?.email}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>가입일</span>
            <span style={styles.infoValue}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '-'}
            </span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>포인트</span>
            <span style={styles.infoValue}>{user?.points || 0} P</span>
          </div>
        </div>

        {/* 프로필 편집 폼 */}
        <form onSubmit={handleSave} style={styles.formCard}>
          <h2 style={styles.formTitle}>프로필 정보</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>사용자명</label>
            <input
              type="text"
              value={formData.username}
              placeholder="사용자명"
              style={{...styles.input, backgroundColor: '#f5f5f5', cursor: 'not-allowed'}}
              disabled={true}
              title="사용자명은 변경할 수 없습니다"
            />
            <p style={styles.hint}>사용자명은 변경할 수 없습니다</p>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>나이</label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                min="18"
                max="100"
                placeholder="나이"
                style={styles.input}
                disabled={saving}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>성별</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                style={styles.input}
                disabled={saving}
              >
                <option value="">선택하지 않음</option>
                <option value="남성">남성</option>
                <option value="여성">여성</option>
                <option value="기타">기타</option>
              </select>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>지역</label>
              <select
                name="region"
                value={formData.region}
                onChange={handleChange}
                style={styles.input}
                disabled={saving}
              >
                <option value="">선택하지 않음</option>
                {REGIONS.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>MBTI</label>
              <select
                name="mbti"
                value={formData.mbti}
                onChange={handleChange}
                style={styles.input}
                disabled={saving}
              >
                <option value="">선택하지 않음</option>
                {MBTI_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>자기소개</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="자신을 소개해주세요 (최대 500자)"
              style={{...styles.input, ...styles.textarea}}
              maxLength="500"
              disabled={saving}
              rows="4"
            />
            <span style={styles.charCount}>
              {formData.bio.length} / 500
            </span>
          </div>

          <div style={styles.buttonGroup}>
            <button
              type="submit"
              disabled={saving}
              style={{
                ...styles.submitButton,
                opacity: saving ? 0.6 : 1,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              onClick={handleChangePassword}
              style={styles.secondaryButton}
              disabled={saving}
            >
              비밀번호 변경
            </button>
          </div>
        </form>

        {/* 위험한 작업 섹션 */}
        <div style={styles.dangerCard}>
          <h2 style={styles.dangerTitle}>⚠️ 위험한 작업</h2>
          <p style={styles.dangerDesc}>
            아래 작업은 되돌릴 수 없으니 신중하게 진행하세요.
          </p>
          <a href="/account-settings/change-password" style={styles.dangerLink}>
            비밀번호 변경
          </a>
          <a href="/account-settings/deactivate" style={styles.dangerLink}>
            계정 비활성화
          </a>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    paddingTop: '100px',
    paddingBottom: '90px',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  pageHeader: {
    marginBottom: '30px',
  },
  backLink: {
    color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    display: 'inline-block',
    marginBottom: '15px',
    transition: 'color 0.2s',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    marginBottom: '5px',
    margin: '0 0 5px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    margin: '0',
  },
  errorCard: {
    background: 'rgba(220, 53, 69, 0.9)',
    color: 'white',
    padding: '15px 20px',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid rgba(220, 53, 69, 0.5)',
  },
  successCard: {
    background: 'rgba(40, 167, 69, 0.9)',
    color: 'white',
    padding: '15px 20px',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid rgba(40, 167, 69, 0.5)',
  },
  infoCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '12px',
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: '16px',
    color: '#333',
    fontWeight: '600',
  },
  formCard: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  formTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '20px',
    margin: '0 0 20px 0',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '20px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  textarea: {
    resize: 'vertical',
    minHeight: '100px',
  },
  hint: {
    fontSize: '12px',
    color: '#999',
    marginTop: '4px',
    fontStyle: 'italic',
  },
  charCount: {
    fontSize: '12px',
    color: '#999',
    marginTop: '4px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '30px',
  },
  submitButton: {
    flex: 1,
    padding: '12px 20px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  secondaryButton: {
    flex: 1,
    padding: '12px 20px',
    background: '#ddd',
    color: '#333',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  dangerCard: {
    background: 'rgba(255,255,255,0.95)',
    padding: '20px',
    borderRadius: '12px',
    border: '2px solid #dc3545',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  dangerTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#dc3545',
    margin: '0 0 10px 0',
  },
  dangerDesc: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 15px 0',
    lineHeight: '1.5',
  },
  dangerLink: {
    display: 'inline-block',
    padding: '10px 16px',
    background: '#dc3545',
    color: 'white',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '600',
    marginRight: '10px',
    marginBottom: '10px',
    transition: 'all 0.2s',
  },
  loadingSpinner: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '20px',
    color: 'white',
  },
};
