'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function Dashboard() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    likes: 0,
    matches: 0,
    messages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // AuthContext 하이드레이션이 완료될 때까지 대기
    if (!hydrated) {
      console.log('[Dashboard] AuthContext 하이드레이션 대기 중...');
      return;
    }

    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        console.log('[Dashboard] 토큰 확인:', {
          hasToken: !!token,
          tokenLength: token?.length,
          timestamp: new Date().toISOString()
        });

        if (!token) {
          console.log('[Dashboard] 토큰 없음, 로그인 페이지로 이동');
          router.push('/login');
          return;
        }

        console.log('[Dashboard] API 요청 시작: /api/profile');
        const response = await axios.get('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log('[Dashboard] API 응답 성공:', {
          hasUser: !!response.data,
          hasStats: !!response.data.stats
        });
        setUser(response.data);
        setStats(response.data.stats || {});
        setLoading(false);
      } catch (error) {
        console.error('[Dashboard] API 요청 실패:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          timestamp: new Date().toISOString()
        });

        // 401/403 인증 실패 또는 기타 에러
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('[Dashboard] 인증 실패 (401/403), 로그인 페이지로 이동');
        }
        router.push('/login');
      }
    };

    fetchData();
  }, [router, hydrated]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post('/api/auth/logout', {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
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
      {/* 네비게이션 헤더 */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title} onClick={() => router.push('/')}>AI-Match</h1>
          <p style={styles.subtitle}>당신의 완벽한 매칭을 찾아보세요</p>
        </div>
      </div>

      {/* 현재 페이지 제목 */}
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>대시보드</h2>
        <p style={styles.pageSubtitle}>당신의 통계를 확인하세요</p>
      </div>

      {/* 사용자 정보 카드 */}
      {user && (
        <div style={styles.userInfoCard}>
          <p><strong>사용자:</strong> {user.email}</p>
          <p><strong>포인트:</strong> {user.points || 0} P</p>
          <p><strong>MBTI:</strong> {user.mbti || '-'}</p>
          <p><strong>지역:</strong> {user.region || '-'}</p>
        </div>
      )}

      {/* 통계 카드들 */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h3>좋아요</h3>
          <p style={styles.statNumber}>{stats.likes || 0}</p>
        </div>

        <div style={styles.statCard}>
          <h3>매칭</h3>
          <p style={styles.statNumber}>{stats.matches || 0}</p>
        </div>

        <div style={styles.statCard}>
          <h3>메시지</h3>
          <p style={styles.statNumber}>{stats.messages || 0}</p>
        </div>

        <div style={styles.statCard}>
          <h3>포인트</h3>
          <p style={styles.statNumber}>{user?.points || 0}</p>
        </div>
      </div>

      {/* 기능 & 서비스 */}
      <div style={styles.featuresSection}>
        <h3 style={styles.sectionTitle}>💬 메시징 & 소셜</h3>
        <div style={styles.featuresGrid}>
          <a href="/messages" style={styles.featureLink}>
            <span style={styles.featureIcon}>💬</span>
            <div>
              <p style={styles.featureName}>1:1 메시지</p>
              <p style={styles.featureDesc}>개인 메시지 주고받기</p>
            </div>
          </a>
          <a href="/chat" style={styles.featureLink}>
            <span style={styles.featureIcon}>👥</span>
            <div>
              <p style={styles.featureName}>그룹 채팅</p>
              <p style={styles.featureDesc}>단체 채팅방 이용</p>
            </div>
          </a>
          <a href="/wishlist" style={styles.featureLink}>
            <span style={styles.featureIcon}>❤️</span>
            <div>
              <p style={styles.featureName}>위시리스트</p>
              <p style={styles.featureDesc}>마음에 드는 사람 저장</p>
            </div>
          </a>
        </div>
      </div>

      {/* 프로필 & 보상 */}
      <div style={styles.featuresSection}>
        <h3 style={styles.sectionTitle}>⭐ 프로필 & 보상</h3>
        <div style={styles.featuresGrid}>
          <a href="/photos" style={styles.featureLink}>
            <span style={styles.featureIcon}>📸</span>
            <div>
              <p style={styles.featureName}>사진 관리</p>
              <p style={styles.featureDesc}>프로필 사진 업로드</p>
            </div>
          </a>
          <a href="/badges" style={styles.featureLink}>
            <span style={styles.featureIcon}>🏆</span>
            <div>
              <p style={styles.featureName}>뱃지</p>
              <p style={styles.featureDesc}>획득한 성취 확인</p>
            </div>
          </a>
          <a href="/points" style={styles.featureLink}>
            <span style={styles.featureIcon}>⭐</span>
            <div>
              <p style={styles.featureName}>포인트</p>
              <p style={styles.featureDesc}>포인트 잔액 확인</p>
            </div>
          </a>
        </div>
      </div>

      {/* 프리미엄 & 결제 */}
      <div style={styles.featuresSection}>
        <h3 style={styles.sectionTitle}>💳 프리미엄 & 결제</h3>
        <div style={styles.featuresGrid}>
          <a href="/premium" style={styles.featureLink}>
            <span style={styles.featureIcon}>👑</span>
            <div>
              <p style={styles.featureName}>프리미엄</p>
              <p style={styles.featureDesc}>멤버십 업그레이드</p>
            </div>
          </a>
          <a href="/payments" style={styles.featureLink}>
            <span style={styles.featureIcon}>💰</span>
            <div>
              <p style={styles.featureName}>결제 이력</p>
              <p style={styles.featureDesc}>결제 내역 확인</p>
            </div>
          </a>
          <a href="/gifts" style={styles.featureLink}>
            <span style={styles.featureIcon}>🎁</span>
            <div>
              <p style={styles.featureName}>선물</p>
              <p style={styles.featureDesc}>받은 선물 확인</p>
            </div>
          </a>
        </div>
      </div>

      {/* 활동 & 만남 */}
      <div style={styles.featuresSection}>
        <h3 style={styles.sectionTitle}>🎉 활동 & 만남</h3>
        <div style={styles.featuresGrid}>
          <a href="/calls" style={styles.featureLink}>
            <span style={styles.featureIcon}>📞</span>
            <div>
              <p style={styles.featureName}>통화</p>
              <p style={styles.featureDesc}>음성/영상 통화</p>
            </div>
          </a>
          <a href="/events" style={styles.featureLink}>
            <span style={styles.featureIcon}>🎉</span>
            <div>
              <p style={styles.featureName}>이벤트</p>
              <p style={styles.featureDesc}>파티 및 모임 참여</p>
            </div>
          </a>
          <a href="/analytics" style={styles.featureLink}>
            <span style={styles.featureIcon}>📊</span>
            <div>
              <p style={styles.featureName}>분석</p>
              <p style={styles.featureDesc}>활동 통계 확인</p>
            </div>
          </a>
        </div>
      </div>

      {/* 설정 및 관리 */}
      <div style={styles.settingsSection}>
        <h3 style={styles.settingsTitle}>⚙️ 설정 & 관리</h3>
        <div style={styles.settingsGrid}>
          <a href="/notifications" style={styles.settingLink}>
            <span style={styles.settingIcon}>🔔</span>
            <div>
              <p style={styles.settingName}>알림</p>
              <p style={styles.settingDesc}>알림 내역 확인</p>
            </div>
          </a>
          <a href="/search-settings" style={styles.settingLink}>
            <span style={styles.settingIcon}>🔍</span>
            <div>
              <p style={styles.settingName}>검색 설정</p>
              <p style={styles.settingDesc}>매칭 조건 설정</p>
            </div>
          </a>
          <a href="/blocked-users" style={styles.settingLink}>
            <span style={styles.settingIcon}>🚫</span>
            <div>
              <p style={styles.settingName}>차단한 사용자</p>
              <p style={styles.settingDesc}>차단 목록 관리</p>
            </div>
          </a>
          <a href="/account-settings" style={styles.settingLink}>
            <span style={styles.settingIcon}>👤</span>
            <div>
              <p style={styles.settingName}>계정 설정</p>
              <p style={styles.settingDesc}>프로필 관리</p>
            </div>
          </a>
          <a href="/nearby" style={styles.settingLink}>
            <span style={styles.settingIcon}>📍</span>
            <div>
              <p style={styles.settingName}>근처 사용자</p>
              <p style={styles.settingDesc}>지도 기반 검색</p>
            </div>
          </a>
          {user?.isAdmin && (
            <a href="/admin/dashboard" style={styles.settingLink}>
              <span style={styles.settingIcon}>🛡️</span>
              <div>
                <p style={styles.settingName}>관리자</p>
                <p style={styles.settingDesc}>관리 패널</p>
              </div>
            </a>
          )}
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  statCard: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  statNumber: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '10px 0 0 0',
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
  featuresSection: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'white',
    marginBottom: '15px',
    textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '15px',
  },
  featureLink: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '20px',
    textDecoration: 'none',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  featureIcon: {
    fontSize: '32px',
    marginBottom: '10px',
    display: 'block',
  },
  featureName: {
    fontSize: '14px',
    fontWeight: '700',
    margin: '0 0 5px 0',
    color: 'white',
  },
  featureDesc: {
    fontSize: '12px',
    margin: '0',
    color: 'rgba(255,255,255,0.7)',
  },
  settingsSection: {
    marginBottom: '30px',
  },
  settingsTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'white',
    marginBottom: '15px',
    textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
  },
  settingLink: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '18px',
    textDecoration: 'none',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  settingIcon: {
    fontSize: '28px',
    marginBottom: '8px',
    display: 'block',
  },
  settingName: {
    fontSize: '13px',
    fontWeight: '700',
    margin: '0 0 4px 0',
    color: 'white',
  },
  settingDesc: {
    fontSize: '11px',
    margin: '0',
    color: 'rgba(255,255,255,0.6)',
  },
};
