'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hydrated) {
      console.log('[AdminDashboard] AuthContext 하이드레이션 대기 중...');
      return;
    }

    fetchStats();
  }, [hydrated]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('[AdminDashboard] API 요청: /api/admin/stats');
      const response = await axios.get('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStats(response.data.data);
      console.log('[AdminDashboard] 통계 로드 성공');
    } catch (err) {
      if (err.response?.status === 403) {
        setError('관리자 권한이 필요합니다');
        console.log('[AdminDashboard] 권한 없음');
      } else if (err.response?.status === 401) {
        router.push('/login');
      } else {
        const errorMsg = err.response?.data?.error || '통계 로드에 실패했습니다';
        setError(errorMsg);
        console.error('[AdminDashboard] API 에러:', err);
      }
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

  if (error) {
    return (
      <>
        <TopNav />
        <div style={styles.container}>
          <div style={styles.errorBox}>
            <h2>⚠️ 접근 불가</h2>
            <p>{error}</p>
            <Link href="/dashboard" style={styles.homeLink}>
              대시보드로 돌아가기
            </Link>
          </div>
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
          <h1 style={styles.title}>👨‍💼 관리자 대시보드</h1>
          <p style={styles.subtitle}>시스템 통계 및 관리 도구</p>
        </div>

        {/* 주요 메트릭스 */}
        <div style={styles.metricsGrid}>
          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <span style={styles.metricIcon}>👥</span>
              <span style={styles.metricLabel}>전체 사용자</span>
            </div>
            <p style={styles.metricValue}>{stats?.users?.total || 0}</p>
            <p style={styles.metricSubtext}>
              {stats?.users?.newToday || 0}명 오늘 가입
            </p>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <span style={styles.metricIcon}>🟢</span>
              <span style={styles.metricLabel}>활성 사용자</span>
            </div>
            <p style={styles.metricValue}>{stats?.users?.active || 0}</p>
            <p style={styles.metricSubtext}>7일 이내 활동</p>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <span style={styles.metricIcon}>✅</span>
              <span style={styles.metricLabel}>사진 인증</span>
            </div>
            <p style={styles.metricValue}>{stats?.users?.photoVerified || 0}</p>
            <p style={styles.metricSubtext}>
              {stats?.users?.total > 0
                ? Math.round((stats?.users?.photoVerified / stats?.users?.total) * 100)
                : 0}% 인증률
            </p>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricHeader}>
              <span style={styles.metricIcon}>🚨</span>
              <span style={styles.metricLabel}>미처리 신고</span>
            </div>
            <p style={styles.metricValue}>{stats?.reports?.pending || 0}</p>
            <p style={styles.metricSubtext}>
              전체 신고: {stats?.reports?.total || 0}건
            </p>
          </div>
        </div>

        {/* 계정 상태 */}
        <div style={styles.statusGrid}>
          <div style={styles.statusCard}>
            <h3 style={styles.statusTitle}>⏸️ 정지된 계정</h3>
            <p style={styles.statusNumber}>{stats?.users?.suspended || 0}</p>
          </div>

          <div style={styles.statusCard}>
            <h3 style={styles.statusTitle}>🚫 차단된 계정</h3>
            <p style={styles.statusNumber}>{stats?.users?.blocked || 0}</p>
          </div>

          <div style={styles.statusCard}>
            <h3 style={styles.statusTitle}>💬 메시지</h3>
            <p style={styles.statusNumber}>{stats?.interactions?.messages || 0}</p>
          </div>

          <div style={styles.statusCard}>
            <h3 style={styles.statusTitle}>💕 매칭</h3>
            <p style={styles.statusNumber}>{stats?.interactions?.matches || 0}</p>
          </div>

          <div style={styles.statusCard}>
            <h3 style={styles.statusTitle}>❤️ 좋아요</h3>
            <p style={styles.statusNumber}>{stats?.interactions?.likes || 0}</p>
          </div>

          <div style={styles.statusCard}>
            <h3 style={styles.statusTitle}>🔐 실패한 로그인</h3>
            <p style={styles.statusNumber}>{stats?.security?.failedLogins || 0}</p>
          </div>
        </div>

        {/* 관리 섹션 */}
        <div style={styles.managementSection}>
          <h2 style={styles.sectionTitle}>⚙️ 관리 도구</h2>
          <div style={styles.managementGrid}>
            <Link href="/admin/reports" style={styles.managementCard}>
              <span style={styles.managementIcon}>🚨</span>
              <div>
                <p style={styles.managementName}>신고 관리</p>
                <p style={styles.managementDesc}>사용자 신고 검토 및 처리</p>
              </div>
              <span style={styles.arrow}>→</span>
            </Link>

            <Link href="/admin/users" style={styles.managementCard}>
              <span style={styles.managementIcon}>👥</span>
              <div>
                <p style={styles.managementName}>사용자 관리</p>
                <p style={styles.managementDesc}>계정 정지, 차단 등 관리</p>
              </div>
              <span style={styles.arrow}>→</span>
            </Link>

            <Link href="/admin/audit-logs" style={styles.managementCard}>
              <span style={styles.managementIcon}>📝</span>
              <div>
                <p style={styles.managementName}>감시 로그</p>
                <p style={styles.managementDesc}>로그인 시도 및 활동 기록</p>
              </div>
              <span style={styles.arrow}>→</span>
            </Link>

            <Link href="/admin/verification" style={styles.managementCard}>
              <span style={styles.managementIcon}>📸</span>
              <div>
                <p style={styles.managementName}>사진 인증</p>
                <p style={styles.managementDesc}>사용자 사진 검증 현황</p>
              </div>
              <span style={styles.arrow}>→</span>
            </Link>
          </div>
        </div>

        {/* 시스템 정보 */}
        <div style={styles.systemCard}>
          <h2 style={styles.systemTitle}>ℹ️ 시스템 정보</h2>
          <div style={styles.systemInfo}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>마지막 업데이트</span>
              <span style={styles.infoValue}>
                {new Date().toLocaleDateString('ko-KR')} {new Date().toLocaleTimeString('ko-KR')}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>데이터베이스 상태</span>
              <span style={{...styles.infoValue, color: '#28a745'}}>✅ 정상</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>API 상태</span>
              <span style={{...styles.infoValue, color: '#28a745'}}>✅ 정상</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
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
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
    marginBottom: '30px',
  },
  metricCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  metricIcon: {
    fontSize: '20px',
  },
  metricLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '0 0 5px 0',
  },
  metricSubtext: {
    fontSize: '12px',
    color: '#999',
    margin: '0',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '30px',
  },
  statusCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  statusTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#666',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
  },
  statusNumber: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '0',
  },
  managementSection: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
    marginBottom: '15px',
    textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
  },
  managementGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
  },
  managementCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    textDecoration: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  managementIcon: {
    fontSize: '32px',
    minWidth: '40px',
  },
  managementName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 4px 0',
  },
  managementDesc: {
    fontSize: '12px',
    color: '#999',
    margin: '0',
  },
  arrow: {
    marginLeft: 'auto',
    fontSize: '18px',
    color: '#667eea',
  },
  systemCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  systemTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 20px 0',
  },
  systemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  infoLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
  },
  infoValue: {
    fontSize: '14px',
    color: '#333',
  },
  errorBox: {
    background: 'white',
    padding: '40px 20px',
    borderRadius: '12px',
    textAlign: 'center',
    marginTop: '60px',
  },
  homeLink: {
    display: 'inline-block',
    marginTop: '20px',
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
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
