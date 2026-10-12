'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import TopNav from '@/components/TopNav';
import Link from 'next/link';

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await axios.get('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(response.data);
        // 데이터베이스에서 설정값 로드
        setNotificationsEnabled(response.data.notificationsEnabled ?? true);
        setIsPrivate(response.data.isPrivate ?? false);
        setLoading(false);
      } catch (error) {
        console.error('설정 조회 실패:', error);
        router.push('/login');
      }
    };

    fetchData();

    // 탭이 활성화될 때마다 데이터 새로고침
    const handleWindowFocus = () => {
      fetchData();
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [router]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/auth/logout', {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      localStorage.removeItem('token');
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      localStorage.removeItem('token');
      router.push('/login');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setMessage('저장 중...');
      const token = localStorage.getItem('token');

      // 설정 저장 API 호출
      const response = await axios.post('/api/profile', { notificationsEnabled, isPrivate }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 저장된 데이터로 상태 업데이트
      if (response.data) {
        setNotificationsEnabled(response.data.notificationsEnabled ?? true);
        setIsPrivate(response.data.isPrivate ?? false);
      }

      setMessage('✅ 설정이 저장되었습니다.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ 저장 실패했습니다.');
      console.error('설정 저장 실패:', error);
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
      {/* 헤더 */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title} onClick={() => router.push('/')}>AI-Match</h1>
          <p style={styles.subtitle}>당신의 완벽한 매칭을 찾아보세요</p>
        </div>
      </div>

      {/* 페이지 제목 */}
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>설정</h2>
        <p style={styles.pageSubtitle}>앱 설정을 관리하세요</p>
      </div>

      {/* 사용자 정보 */}
      {user && (
        <div style={styles.userInfoCard}>
          <p><strong>사용자:</strong> {user.email}</p>
          <p><strong>가입일:</strong> {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '-'}</p>
        </div>
      )}

      {/* 설정 섹션 */}
      <div style={styles.settingsSection}>
        <h3 style={styles.sectionTitle}>알림 설정</h3>

        <div style={styles.settingItem}>
          <label style={styles.label}>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.labelText}>알림 활성화</span>
          </label>
          <p style={styles.settingDescription}>
            새로운 매칭, 메시지, 좋아요에 대한 알림을 받습니다.
          </p>
        </div>

        <div style={styles.settingItem}>
          <label style={styles.label}>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.labelText}>프로필 비공개</span>
          </label>
          <p style={styles.settingDescription}>
            프로필을 다른 사용자에게 표시하지 않습니다.
          </p>
        </div>
      </div>

      {/* 저장 메시지 */}
      {message && (
        <div style={styles.messageBox}>
          {message}
        </div>
      )}

      {/* 저장 버튼 */}
      <button onClick={handleSaveSettings} style={styles.saveButton}>
        설정 저장
      </button>

      {/* 비밀번호 변경 */}
      <div style={styles.securitySection}>
        <h3 style={styles.sectionTitle}>보안</h3>
        <div style={styles.settingItem}>
          <p style={styles.settingDescription}>정기적으로 비밀번호를 변경하여 계정을 보호하세요</p>
          <Link href="/settings/change-password" style={styles.changePasswordButton}>
            비밀번호 변경
          </Link>
        </div>
      </div>

{/* 로그아웃 버튼 */}
      <div style={styles.logoutSection}>
        <button onClick={handleLogout} style={styles.logoutButton}>로그아웃</button>
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
    paddingTop: '80px',
    paddingBottom: '90px',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  header: {
    textAlign: 'center',
    color: 'white',
    marginBottom: '40px',
    borderBottom: '2px solid rgba(255,255,255,0.1)',
    paddingBottom: '30px',
  },
  headerContent: {
    cursor: 'pointer',
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    marginBottom: '5px',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    margin: '0',
  },
  subtitle: {
    fontSize: '16px',
    marginBottom: '0',
    color: 'rgba(255,255,255,0.8)',
  },
  pageHeader: {
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid rgba(102,126,234,0.3)',
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    marginBottom: '5px',
    margin: '0 0 5px 0',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    margin: '0',
  },
  userInfoCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(102,126,234,0.3)',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '30px',
    color: 'white',
  },
  settingsSection: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#333',
    marginTop: '0',
  },
  settingItem: {
    marginBottom: '25px',
    paddingBottom: '20px',
    borderBottom: '1px solid #eee',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    marginBottom: '10px',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    marginRight: '10px',
    cursor: 'pointer',
  },
  labelText: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#333',
  },
  settingDescription: {
    fontSize: '14px',
    color: '#666',
    margin: '5px 0 0 30px',
  },
  messageBox: {
    background: 'rgba(102,126,234,0.1)',
    border: '1px solid rgba(102,126,234,0.3)',
    color: 'white',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  saveButton: {
    display: 'block',
    margin: '20px auto',
    padding: '12px 40px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
    securitySection: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  changePasswordButton: {
    display: 'inline-block',
    marginTop: '10px',
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background 0.2s',
    cursor: 'pointer',
  },
logoutSection: {
    textAlign: 'center',
    marginTop: '30px',
  },
  logoutButton: {
    padding: '12px 32px',
    background: 'rgba(231, 76, 60, 0.9)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
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
