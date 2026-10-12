'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import { loadTokensFromStorage, getTokens, clearTokens } from '@/lib/apiClient';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        loadTokensFromStorage();
        const { accessToken } = getTokens();

        if (!accessToken) {
          router.push('/login');
          return;
        }

        const response = await axios.get('/api/profile', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        setUser(response.data);
        setLoading(false);
      } catch (err) {
        console.error('프로필 조회 실패:', err);
        clearTokens();
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      const { accessToken } = getTokens();
      if (accessToken) {
        await axios.post('/api/auth/logout', {}, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('로그아웃 실패:', error);
    } finally {
      clearTokens();
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingSpinner}>로딩 중...</div>
      </div>
    );
  }

  return (
    <>
      <TopNav />
      <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>AI-Match</h1>
        <p style={styles.subtitle}>당신의 완벽한 매칭을 찾아보세요</p>
      </div>

      {user && (
        <div style={styles.profileSection}>
          <div style={styles.profileContent}>
            <div style={styles.profileLeft}>
              <div style={styles.profileLabel}>👤 프로필</div>
              <h3 style={styles.profileName}>{user.username || user.email.split('@')[0]}</h3>
              <p style={styles.profileEmail}>{user.email}</p>
            </div>
            <div style={styles.profileRight}>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{user.age || '-'}</span>
                <span style={styles.statLabel}>세</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{user.points || 0}</span>
                <span style={styles.statLabel}>포인트</span>
              </div>
            </div>
          </div>
          <div style={styles.profileDetail}>
            <span style={styles.detailBadge}>{user.gender || '미설정'}</span>
            <span style={styles.detailBadge}>{user.region || '미설정'}</span>
            <span style={styles.detailBadge}>{user.mbti || '미설정'}</span>
          </div>
        </div>
      )}

      <button onClick={handleLogout} style={styles.logoutButton}>
        로그아웃
      </button>

      <BottomNav />
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    paddingTop: '80px',
    paddingBottom: '100px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    textAlign: 'center',
    color: 'white',
    marginBottom: '50px',
    paddingBottom: '20px',
  },
  title: {
    fontSize: '48px',
    fontWeight: '800',
    margin: '0 0 12px 0',
    letterSpacing: '-1px',
  },
  subtitle: {
    fontSize: '16px',
    margin: '0',
    opacity: 0.85,
    fontWeight: '500',
  },
  profileSection: {
    maxWidth: '1000px',
    margin: '0 auto 50px',
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(10px)',
    padding: '25px 30px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  },
  profileContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    flexWrap: 'wrap',
    gap: '30px',
  },
  profileLeft: {
    flex: 1,
    minWidth: '200px',
  },
  profileLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: '1px',
    marginBottom: '8px',
    textTransform: 'uppercase',
  },
  profileName: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'white',
    margin: '0 0 5px 0',
  },
  profileEmail: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.8)',
    margin: '0',
  },
  profileRight: {
    display: 'flex',
    gap: '30px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#FFD700',
  },
  statLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.7)',
    marginTop: '4px',
  },
  profileDetail: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  detailBadge: {
    display: 'inline-block',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
  },
  featuresGrid: {
    maxWidth: '1200px',
    margin: '0 auto 40px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '18px',
  },
  featureCard: {
    background: 'white',
    padding: '24px 20px',
    borderRadius: '14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  featureTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 10px 0',
  },
  featureDesc: {
    fontSize: '13px',
    color: '#666',
    margin: '0 0 16px 0',
    lineHeight: '1.5',
  },
  cardButton: {
    padding: '10px 22px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
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
  logoutButton: {
    display: 'block',
    margin: '20px auto',
    padding: '12px 32px',
    background: 'rgba(231, 76, 60, 0.9)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
};
