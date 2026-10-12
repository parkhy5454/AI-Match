'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import TopNav from '@/components/TopNav';

export default function Referral() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [referralRewards, setReferralRewards] = useState(0);
  const [copied, setCopied] = useState(false);

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
        // 테스트용 추천 코드 생성 (실제로는 백엔드에서 가져와야 함)
        setReferralCode(`AI-MATCH-${response.data.id?.substring(0, 8).toUpperCase()}`);
        setLoading(false);
      } catch (error) {
        console.error('추천 정보 조회 실패:', error);
        router.push('/login');
      }
    };

    fetchData();
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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 추천 링크 생성
  const getReferralLink = () => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/register?ref=${referralCode}`;
  };

  // 링크 복사
  const handleCopyLink = () => {
    const link = getReferralLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 카톡 공유 (Web Intent)
  const handleKakaoShare = async () => {
    try {
      const link = getReferralLink();
      const text = `AI-Match에 가입하고 싶으신가요? 제 추천 코드를 사용하면 100 포인트를 받으실 수 있습니다!\n\n${link}\n\n추천 코드: ${referralCode}`;

      // Clipboard API 사용
      await navigator.clipboard.writeText(text);
      alert('✅ 내용이 복사되었습니다!\n\n카톡/메시지 앱을 열어 붙여넣기(Ctrl+V 또는 손가락으로 길게 눌러 붙여넣기)하세요.');
    } catch (error) {
      console.error('복사 실패:', error);
      alert('❌ 복사 실패. 브라우저가 최신 버전인지 확인하세요.');
    }
  };

  // 문자 공유
  const handleSMSShare = () => {
    const link = getReferralLink();
    const text = `AI-Match에 가입하세요! 추천 코드 ${referralCode}를 사용하면 100P를 받아요. ${link}`;
    window.location.href = `sms:?body=${encodeURIComponent(text)}`;
  };

  // URL 공유
  const handleURLShare = () => {
    const link = getReferralLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    alert('✅ 추천 링크가 복사되었습니다!');
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
        <h2 style={styles.pageTitle}>추천 보상</h2>
        <p style={styles.pageSubtitle}>친구를 초대하고 보상을 받으세요</p>
      </div>

      {/* 사용자 정보 */}
      {user && (
        <div style={styles.userInfoCard}>
          <p><strong>사용자:</strong> {user.email}</p>
          <p><strong>현재 포인트:</strong> {user.points || 0} P</p>
        </div>
      )}

      {/* 추천 코드 섹션 */}
      <div style={styles.referralSection}>
        <h3 style={styles.sectionTitle}>📬 추천 코드</h3>

        <div style={styles.codeBox}>
          <p style={styles.codeLabel}>당신의 추천 코드:</p>
          <div style={styles.codeDisplay}>
            <span style={styles.code}>{referralCode}</span>
            <button
              onClick={handleCopyCode}
              style={styles.copyButton}
            >
              {copied ? '✅ 복사됨' : '📋 복사'}
            </button>
          </div>
          <p style={styles.codeDescription}>
            이 코드를 친구들과 공유하고, 친구가 가입하면 보상을 받으세요!
          </p>
        </div>

        {/* 추천 링크 섹션 */}
        <div style={styles.linkBox}>
          <p style={styles.linkLabel}>📱 추천 링크 공유</p>
          <p style={styles.linkDescription}>아래 버튼으로 친구에게 바로 공유하세요!</p>

          <div style={styles.shareButtonGrid}>
            <button
              onClick={handleKakaoShare}
              style={{...styles.shareButton, background: '#FFE812', color: '#333'}}
            >
              💬 카톡/문자
            </button>
            <button
              onClick={handleSMSShare}
              style={{...styles.shareButton, background: '#34C759', color: 'white'}}
            >
              📲 문자 앱
            </button>
            <button
              onClick={handleURLShare}
              style={{...styles.shareButton, background: '#667eea', color: 'white'}}
            >
              🔗 링크 복사
            </button>
          </div>

          <div style={styles.linkDisplay}>
            <p style={styles.smallLabel}>공유 링크:</p>
            <input
              type="text"
              value={getReferralLink()}
              readOnly
              style={styles.linkInput}
            />
          </div>
        </div>
      </div>

      {/* 통계 섹션 */}
      <div style={styles.statsSection}>
        <h3 style={styles.sectionTitle}>📊 추천 통계</h3>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>추천한 친구</p>
            <p style={styles.statNumber}>{referralCount}명</p>
          </div>

          <div style={styles.statCard}>
            <p style={styles.statLabel}>획득 보상</p>
            <p style={styles.statNumber}>{referralRewards}P</p>
          </div>
        </div>
      </div>

      {/* 보상 정보 섹션 */}
      <div style={styles.infoSection}>
        <h3 style={styles.sectionTitle}>🎁 보상 정보</h3>

        <div style={styles.infoBox}>
          <p><strong>친구 가입:</strong> 100 포인트</p>
          <p><strong>친구가 첫 매칭:</strong> 50 포인트 추가</p>
          <p><strong>친구가 프리미엄 구독:</strong> 200 포인트 추가</p>
          <p style={styles.infoNote}>※ 보상은 자동으로 계정에 추가됩니다.</p>
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
  referralSection: {
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
  codeBox: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    border: '2px dashed #667eea',
    marginBottom: '15px',
  },
  codeLabel: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px',
    marginTop: '0',
  },
  codeDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '15px',
  },
  code: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#667eea',
    fontFamily: 'monospace',
    flex: 1,
  },
  copyButton: {
    padding: '8px 16px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  codeDescription: {
    fontSize: '14px',
    color: '#666',
    margin: '0',
  },
  linkBox: {
    background: '#f0f4ff',
    padding: '20px',
    borderRadius: '8px',
    border: '2px solid #667eea',
    marginTop: '20px',
  },
  linkLabel: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
    marginTop: '0',
  },
  linkDescription: {
    fontSize: '13px',
    color: '#666',
    margin: '0 0 15px 0',
  },
  shareButtonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '10px',
    marginBottom: '15px',
  },
  shareButton: {
    padding: '12px 16px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  linkDisplay: {
    background: 'white',
    padding: '12px',
    borderRadius: '6px',
    marginTop: '15px',
  },
  smallLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px',
    marginTop: '0',
  },
  linkInput: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'monospace',
    boxSizing: 'border-box',
    color: '#667eea',
    backgroundColor: '#f8f9fa',
  },
  statsSection: {
    marginBottom: '30px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  statCard: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px',
    marginTop: '0',
  },
  statNumber: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '0',
  },
  infoSection: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  infoBox: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    borderLeft: '4px solid #667eea',
  },
  infoNote: {
    fontSize: '12px',
    color: '#999',
    marginTop: '15px',
    marginBottom: '0',
    fontStyle: 'italic',
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
