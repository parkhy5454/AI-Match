'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function BadgesPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [badges, setBadges] = useState([]);
  const [userBadges, setUserBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hydrated) return;
    fetchBadges();
  }, [hydrated]);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `/api/badges`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBadges(response.data.data.allBadges || []);
      setUserBadges(response.data.data.userBadges || []);
    } catch (err) {
      const errorMsg = err.response?.data?.error || '뱃지 정보 조회에 실패했습니다';
      setError(errorMsg);
      console.error('에러:', err);
    } finally {
      setLoading(false);
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

  const userBadgeIds = userBadges.map(ub => ub.badgeId);

  return (
    <>
      <TopNav />
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <Link href="/dashboard" style={styles.backLink}>
            ← 뒤로 가기
          </Link>
          <h1 style={styles.title}>🏆 뱃지</h1>
          <p style={styles.subtitle}>나의 성취를 확인하세요</p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* 뱃지 요약 */}
        <div style={styles.summary}>
          <div style={styles.summaryCard}>
            <p style={styles.summaryLabel}>보유 뱃지</p>
            <p style={styles.summaryValue}>{userBadges.length}</p>
          </div>
          <div style={styles.summaryCard}>
            <p style={styles.summaryLabel}>전체 뱃지</p>
            <p style={styles.summaryValue}>{badges.length}</p>
          </div>
          <div style={styles.summaryCard}>
            <p style={styles.summaryLabel}>달성률</p>
            <p style={styles.summaryValue}>
              {badges.length > 0 ? Math.round((userBadges.length / badges.length) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* 보유 뱃지 */}
        {userBadges.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>✨ 보유 뱃지</h2>
            <div style={styles.badgesGrid}>
              {badges
                .filter(b => userBadgeIds.includes(b.id))
                .map((badge) => (
                  <div key={badge.id} style={styles.badgeCard}>
                    <div style={styles.badgeIcon}>{badge.icon}</div>
                    <h4 style={styles.badgeName}>{badge.name}</h4>
                    <p style={styles.badgeDescription}>{badge.description}</p>
                    <p style={styles.badgeUnlocked}>✓ 획득함</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 미달성 뱃지 */}
        {badges.some(b => !userBadgeIds.includes(b.id)) && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🔒 도전 뱃지</h2>
            <div style={styles.badgesGrid}>
              {badges
                .filter(b => !userBadgeIds.includes(b.id))
                .map((badge) => (
                  <div key={badge.id} style={styles.lockedBadgeCard}>
                    <div style={styles.lockedIcon}>{badge.icon}</div>
                    <h4 style={styles.badgeName}>{badge.name}</h4>
                    <p style={styles.badgeDescription}>{badge.description}</p>
                    <p style={styles.badgeLocked}>🔒 미달성</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 뱃지 정보 */}
        <div style={styles.infoSection}>
          <h2 style={styles.sectionTitle}>💡 뱃지란?</h2>
          <div style={styles.infoCard}>
            <p>
              뱃지는 앱 내에서 특정 활동을 완료하거나 조건을 달성할 때 자동으로 부여되는 성취 기호입니다.
            </p>
            <ul style={styles.infoList}>
              <li>프로필 완성 시 획득</li>
              <li>일정 수의 좋아요 받음</li>
              <li>첫 메시지 전송</li>
              <li>프리미엄 가입</li>
              <li>친구 초대 성공</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
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
  summary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '30px',
  },
  summaryCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  summaryLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    margin: '0 0 8px 0',
  },
  summaryValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '0',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
    marginBottom: '15px',
    textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
  },
  badgesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '12px',
  },
  badgeCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  lockedBadgeCard: {
    background: 'rgba(255,255,255,0.5)',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    opacity: 0.6,
  },
  badgeIcon: {
    fontSize: '48px',
    marginBottom: '10px',
  },
  lockedIcon: {
    fontSize: '48px',
    marginBottom: '10px',
    filter: 'grayscale(100%)',
  },
  badgeName: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#333',
    margin: '10px 0 5px 0',
  },
  badgeDescription: {
    fontSize: '11px',
    color: '#999',
    margin: '0 0 10px 0',
  },
  badgeUnlocked: {
    fontSize: '12px',
    color: '#28a745',
    fontWeight: '600',
    margin: '0',
  },
  badgeLocked: {
    fontSize: '12px',
    color: '#999',
    fontWeight: '600',
    margin: '0',
  },
  infoSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  infoCard: {
    background: '#f9f9f9',
    padding: '20px',
    borderRadius: '8px',
  },
  infoList: {
    marginTop: '15px',
    paddingLeft: '20px',
    color: '#666',
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
