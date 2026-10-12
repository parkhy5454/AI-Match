'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function SearchSettingsPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [settings, setSettings] = useState({
    ageMin: 20,
    ageMax: 40,
    region: '',
    mbtiPreferences: [],
    heightMin: 150,
    heightMax: 190,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const mbtiTypes = [
    'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
    'ISTP', 'ISFP', 'INFP', 'INTP',
    'ESTP', 'ESFP', 'ENFP', 'ENTP',
    'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
  ];

  const regions = [
    '서울', '부산', '대구', '인천', '광주',
    '대전', '울산', '세종', '경기도', '강원도',
    '충청북도', '충청남도', '전라북도', '전라남도',
    '경상북도', '경상남도', '제주도'
  ];

  useEffect(() => {
    if (!hydrated) return;
    fetchSettings();
  }, [hydrated]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `/api/search-preferences`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data.data;
      setSettings({
        ageMin: data.ageMin || 20,
        ageMax: data.ageMax || 40,
        region: data.region || '',
        mbtiPreferences: data.mbtiPreferences || [],
        heightMin: data.heightMin || 150,
        heightMax: data.heightMax || 190,
      });
    } catch (err) {
      const errorMsg = err.response?.data?.error || '설정 조회에 실패했습니다';
      setError(errorMsg);
      console.error('에러:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const token = localStorage.getItem('accessToken');

      await axios.put(
        `/api/search-preferences`,
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || '저장에 실패했습니다';
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const toggleMbti = (mbti) => {
    if (settings.mbtiPreferences.includes(mbti)) {
      setSettings({
        ...settings,
        mbtiPreferences: settings.mbtiPreferences.filter(m => m !== mbti),
      });
    } else {
      setSettings({
        ...settings,
        mbtiPreferences: [...settings.mbtiPreferences, mbti],
      });
    }
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
        <div style={styles.pageHeader}>
          <Link href="/dashboard" style={styles.backLink}>
            ← 뒤로 가기
          </Link>
          <h1 style={styles.title}>🔍 검색 설정</h1>
          <p style={styles.subtitle}>매칭 조건을 설정하세요</p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p>⚠️ {error}</p>
          </div>
        )}

        {saved && (
          <div style={styles.successCard}>
            <p>✅ 설정이 저장되었습니다</p>
          </div>
        )}

        <div style={styles.settingsForm}>
          {/* 나이 범위 */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>👤 나이</h2>
            <div style={styles.rangeSection}>
              <div style={styles.rangeInput}>
                <label>최소 나이</label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={settings.ageMin}
                  onChange={(e) => setSettings({
                    ...settings,
                    ageMin: parseInt(e.target.value),
                  })}
                  style={styles.input}
                />
                <span style={styles.inputValue}>{settings.ageMin}세</span>
              </div>
              <div style={styles.rangeInput}>
                <label>최대 나이</label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={settings.ageMax}
                  onChange={(e) => setSettings({
                    ...settings,
                    ageMax: parseInt(e.target.value),
                  })}
                  style={styles.input}
                />
                <span style={styles.inputValue}>{settings.ageMax}세</span>
              </div>
            </div>
          </div>

          {/* 키 범위 */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>📏 키</h2>
            <div style={styles.rangeSection}>
              <div style={styles.rangeInput}>
                <label>최소 키</label>
                <input
                  type="number"
                  min="140"
                  max="220"
                  value={settings.heightMin}
                  onChange={(e) => setSettings({
                    ...settings,
                    heightMin: parseInt(e.target.value),
                  })}
                  style={styles.input}
                />
                <span style={styles.inputValue}>{settings.heightMin}cm</span>
              </div>
              <div style={styles.rangeInput}>
                <label>최대 키</label>
                <input
                  type="number"
                  min="140"
                  max="220"
                  value={settings.heightMax}
                  onChange={(e) => setSettings({
                    ...settings,
                    heightMax: parseInt(e.target.value),
                  })}
                  style={styles.input}
                />
                <span style={styles.inputValue}>{settings.heightMax}cm</span>
              </div>
            </div>
          </div>

          {/* 지역 */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>📍 지역</h2>
            <select
              value={settings.region}
              onChange={(e) => setSettings({
                ...settings,
                region: e.target.value,
              })}
              style={styles.select}
            >
              <option value="">지역을 선택하세요</option>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          {/* MBTI */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>💭 MBTI</h2>
            <p style={styles.sectionHint}>선택하신 MBTI와 매칭되는 사람을 우선 추천합니다</p>
            <div style={styles.mbtiGrid}>
              {mbtiTypes.map((mbti) => (
                <button
                  key={mbti}
                  onClick={() => toggleMbti(mbti)}
                  style={{
                    ...styles.mbtiButton,
                    background: settings.mbtiPreferences.includes(mbti) ? '#667eea' : 'white',
                    color: settings.mbtiPreferences.includes(mbti) ? 'white' : '#333',
                    borderColor: settings.mbtiPreferences.includes(mbti) ? '#667eea' : '#ddd',
                  }}
                >
                  {mbti}
                </button>
              ))}
            </div>
          </div>

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              ...styles.saveButton,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '600px',
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
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
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
    marginBottom: '25px',
  },
  successCard: {
    background: 'rgba(40, 167, 69, 0.9)',
    color: 'white',
    padding: '15px 20px',
    borderRadius: '12px',
    marginBottom: '25px',
  },
  settingsForm: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 15px 0',
  },
  sectionHint: {
    fontSize: '13px',
    color: '#999',
    margin: '0 0 15px 0',
  },
  rangeSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  rangeInput: {
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  inputValue: {
    position: 'absolute',
    right: '10px',
    top: '35px',
    fontSize: '12px',
    color: '#667eea',
    fontWeight: '600',
  },
  select: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  mbtiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  mbtiButton: {
    padding: '10px',
    border: '2px solid #ddd',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  saveButton: {
    width: '100%',
    padding: '12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
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
