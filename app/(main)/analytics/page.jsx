'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function AnalyticsPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('week');

  useEffect(() => {
    if (!hydrated) return;
    fetchAnalytics();
  }, [hydrated, timeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `/api/analytics?timeframe=${timeframe}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || '분석 데이터 조회에 실패했습니다';
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

  return (
    <>
      <TopNav />
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <Link href="/dashboard" style={styles.backLink}>
            ← 뒤로 가기
          </Link>
          <h1 style={styles.title}>📊 분석</h1>
          <p style={styles.subtitle}>활동 통계를 확인하세요</p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* 기간 선택 */}
        <div style={styles.timeframeSection}>
          <button
            onClick={() => setTimeframe('week')}
            style={{
              ...styles.timeframeButton,
              background: timeframe === 'week' ? '#667eea' : 'white',
              color: timeframe === 'week' ? 'white' : '#333',
            }}
          >
            지난 주
          </button>
          <button
            onClick={() => setTimeframe('month')}
            style={{
              ...styles.timeframeButton,
              background: timeframe === 'month' ? '#667eea' : 'white',
              color: timeframe === 'month' ? 'white' : '#333',
            }}
          >
            이번 달
          </button>
          <button
            onClick={() => setTimeframe('all')}
            style={{
              ...styles.timeframeButton,
              background: timeframe === 'all' ? '#667eea' : 'white',
              color: timeframe === 'all' ? 'white' : '#333',
            }}
          >
            전체
          </button>
        </div>

        {analytics && (
          <>
            {/* 주요 통계 */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statInfo}>
                  <p style={styles.statLabel}>조회</p>
                  <p style={styles.statValue}>{analytics.views || 0}</p>
                </div>
                <p style={styles.statIcon}>👁️</p>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statInfo}>
                  <p style={styles.statLabel}>좋아요</p>
                  <p style={styles.statValue}>{analytics.likes || 0}</p>
                </div>
                <p style={styles.statIcon}>❤️</p>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statInfo}>
                  <p style={styles.statLabel}>매칭</p>
                  <p style={styles.statValue}>{analytics.matches || 0}</p>
                </div>
                <p style={styles.statIcon}>💕</p>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statInfo}>
                  <p style={styles.statLabel}>메시지</p>
                  <p style={styles.statValue}>{analytics.messages || 0}</p>
                </div>
                <p style={styles.statIcon}>💬</p>
              </div>
            </div>

            {/* 활동별 통계 */}
            <div style={styles.activitySection}>
              <h2 style={styles.sectionTitle}>🎯 활동 통계</h2>
              <div style={styles.activityGrid}>
                <div style={styles.activityCard}>
                  <h3 style={styles.activityName}>로그인</h3>
                  <p style={styles.activityValue}>{analytics.logins || 0}회</p>
                  <p style={styles.activityDesc}>로그인한 횟수</p>
                </div>

                <div style={styles.activityCard}>
                  <h3 style={styles.activityName}>프로필 수정</h3>
                  <p style={styles.activityValue}>{analytics.profileUpdates || 0}회</p>
                  <p style={styles.activityDesc}>프로필을 수정한 횟수</p>
                </div>

                <div style={styles.activityCard}>
                  <h3 style={styles.activityName}>사진 업로드</h3>
                  <p style={styles.activityValue}>{analytics.photoUploads || 0}장</p>
                  <p style={styles.activityDesc}>업로드한 사진 수</p>
                </div>

                <div style={styles.activityCard}>
                  <h3 style={styles.activityName}>검색</h3>
                  <p style={styles.activityValue}>{analytics.searches || 0}회</p>
                  <p style={styles.activityDesc}>프로필을 검색한 횟수</p>
                </div>
              </div>
            </div>

            {/* 시간대별 활동 */}
            <div style={styles.chartSection}>
              <h2 style={styles.sectionTitle}>⏰ 시간대별 활동</h2>
              <div style={styles.hourlyStats}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((hour) => {
                  const count = analytics.hourlyActivity?.[hour] || 0;
                  const maxCount = Math.max(...(analytics.hourlyActivity ? Object.values(analytics.hourlyActivity) : [1]));
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;

                  return (
                    <div key={hour} style={styles.hourBar}>
                      <div
                        style={{
                          ...styles.bar,
                          height: `${height}%`,
                        }}
                      />
                      <p style={styles.hourLabel}>{hour}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 최근 활동 */}
            <div style={styles.recentSection}>
              <h2 style={styles.sectionTitle}>📝 최근 활동</h2>
              <div style={styles.activityList}>
                {analytics.recentActivities && analytics.recentActivities.length > 0 ? (
                  analytics.recentActivities.map((activity, idx) => (
                    <div key={idx} style={styles.activityItem}>
                      <span style={styles.activityType}>{activity.type}</span>
                      <p style={styles.activityDescription}>{activity.description}</p>
                      <p style={styles.activityDate}>
                        {new Date(activity.timestamp).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  ))
                ) : (
                  <p style={styles.noActivity}>최근 활동이 없습니다</p>
                )}
              </div>
            </div>

            {/* 인사이트 */}
            <div style={styles.insightSection}>
              <h2 style={styles.sectionTitle}>💡 인사이트</h2>
              <div style={styles.insightGrid}>
                <div style={styles.insightCard}>
                  <p style={styles.insightIcon}>🔥</p>
                  <h4 style={styles.insightTitle}>인기도</h4>
                  <p style={styles.insightValue}>
                    {analytics.views > 50 ? '높음' : analytics.views > 20 ? '중간' : '낮음'}
                  </p>
                  <p style={styles.insightDesc}>
                    지난 기간 대비 {((analytics.views || 0) / Math.max(1, (analytics.views || 1) - 10) * 100).toFixed(0)}%
                  </p>
                </div>

                <div style={styles.insightCard}>
                  <p style={styles.insightIcon}>💎</p>
                  <h4 style={styles.insightTitle}>매칭율</h4>
                  <p style={styles.insightValue}>
                    {((analytics.matches || 0) / Math.max(1, (analytics.likes || 1)) * 100).toFixed(1)}%
                  </p>
                  <p style={styles.insightDesc}>좋아요 대비 매칭 비율</p>
                </div>

                <div style={styles.insightCard}>
                  <p style={styles.insightIcon}>⭐</p>
                  <h4 style={styles.insightTitle}>참여도</h4>
                  <p style={styles.insightValue}>
                    {analytics.logins >= 20 ? '매우 활발' : analytics.logins >= 10 ? '활발' : '낮음'}
                  </p>
                  <p style={styles.insightDesc}>로그인 횟수 기준</p>
                </div>
              </div>
            </div>

            {/* 추천 */}
            <div style={styles.recommendationSection}>
              <h2 style={styles.sectionTitle}>🎯 추천</h2>
              <ul style={styles.recommendationList}>
                <li>더 많은 사진을 업로드하면 관심을 받을 확률이 높아집니다</li>
                <li>자기소개를 자세히 작성하면 같은 관심사의 사람들과 만날 수 있습니다</li>
                <li>정기적으로 프로필을 업데이트하면 노출이 높아집니다</li>
                <li>메시지에 성실하게 답장하면 매칭 확률이 올라갑니다</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '1100px',
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
  timeframeSection: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    justifyContent: 'center',
  },
  timeframeButton: {
    padding: '10px 20px',
    border: '2px solid white',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '15px',
    marginBottom: '30px',
  },
  statCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#999',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '0',
  },
  statIcon: {
    fontSize: '32px',
    marginLeft: '10px',
  },
  activitySection: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
    marginBottom: '15px',
    textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
  },
  activityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '15px',
  },
  activityCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  activityName: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 8px 0',
  },
  activityValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '0 0 5px 0',
  },
  activityDesc: {
    fontSize: '12px',
    color: '#999',
    margin: '0',
  },
  chartSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  hourlyStats: {
    display: 'flex',
    gap: '4px',
    height: '150px',
    alignItems: 'flex-end',
  },
  hourBar: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '4px 4px 0 0',
    minHeight: '4px',
  },
  hourLabel: {
    fontSize: '10px',
    color: '#999',
    margin: '4px 0 0 0',
  },
  recentSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  activityItem: {
    background: '#f9f9f9',
    padding: '15px',
    borderRadius: '8px',
    borderLeft: '4px solid #667eea',
  },
  activityType: {
    background: '#667eea',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  activityDescription: {
    fontSize: '13px',
    color: '#333',
    margin: '8px 0 4px 0',
    fontWeight: '500',
  },
  activityDate: {
    fontSize: '12px',
    color: '#999',
    margin: '0',
  },
  noActivity: {
    fontSize: '14px',
    color: '#999',
    textAlign: 'center',
    padding: '20px',
  },
  insightSection: {
    marginBottom: '30px',
  },
  insightGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
  },
  insightCard: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    color: 'white',
  },
  insightIcon: {
    fontSize: '32px',
    margin: '0 0 10px 0',
  },
  insightTitle: {
    fontSize: '14px',
    fontWeight: '700',
    margin: '0 0 8px 0',
  },
  insightValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 5px 0',
  },
  insightDesc: {
    fontSize: '12px',
    margin: '0',
    opacity: 0.8,
  },
  recommendationSection: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '25px',
    color: 'white',
  },
  recommendationList: {
    margin: '0',
    paddingLeft: '20px',
    lineHeight: '1.8',
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
