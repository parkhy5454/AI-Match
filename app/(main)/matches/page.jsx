'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/app/auth-context';
import TopNav from '@/components/TopNav';

export default function Matches() {
  const router = useRouter();
  const { accessToken, hydrated } = useAuth();
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // hydration이 완료될 때까지 기다림
    if (!hydrated) return;

    const fetchData = async () => {
      try {
        if (!accessToken) {
          console.log('[Matches] 인증 토큰 없음, 로그인 페이지로 이동');
          router.push('/login');
          return;
        }

        // apiClient가 자동으로 Authorization 헤더를 추가하므로
        // 수동으로 헤더를 지정할 필요 없음
        const userResponse = await axios.get('/api/profile');
        setUser(userResponse.data);

        // 매칭 데이터 조회
        const matchResponse = await axios.get('/api/matches');

        setMatches(matchResponse.data.data || matchResponse.data.matches || []);
        setLoading(false);
      } catch (error) {
        console.error('[Matches] 데이터 로드 실패:', error);
        if (error.response?.status === 401) {
          console.log('[Matches] 인증 실패, 로그인 페이지로 이동');
          router.push('/login');
        }
      }
    };

    fetchData();
  }, [router, accessToken, hydrated]);

  // ✅ 호환도 계산 함수 (사용자 정보 기반, 좋아요와 무관)
  const calculateCompatibility = (currentUser, matchUser) => {
    if (!currentUser || !matchUser) return 0;

    let score = 0;
    const maxScore = 100;

    // 1. MBTI 호환도 (0-30점)
    if (currentUser.mbti && matchUser.mbti) {
      if (currentUser.mbti === matchUser.mbti) {
        score += 30; // 같은 MBTI
      } else {
        // MBTI 유사도 체크 (E/I, S/N, T/F, J/P)
        let similarityCount = 0;
        const mbtiCurrent = currentUser.mbti;
        const mbtiMatch = matchUser.mbti;

        if (mbtiCurrent[0] === mbtiMatch[0]) similarityCount++; // E/I
        if (mbtiCurrent[1] === mbtiMatch[1]) similarityCount++; // S/N
        if (mbtiCurrent[2] === mbtiMatch[2]) similarityCount++; // T/F
        if (mbtiCurrent[3] === mbtiMatch[3]) similarityCount++; // J/P

        score += similarityCount * 7.5; // 유사한 요소당 7.5점
      }
    }

    // 2. 지역 호환도 (0-25점)
    if (currentUser.region && matchUser.region) {
      if (currentUser.region === matchUser.region) {
        score += 25; // 같은 지역
      }
    }

    // 3. 나이 호환도 (0-25점)
    if (currentUser.age && matchUser.age) {
      const ageDiff = Math.abs(currentUser.age - matchUser.age);
      if (ageDiff === 0) {
        score += 25; // 같은 나이
      } else if (ageDiff <= 3) {
        score += 20; // 3살 이내
      } else if (ageDiff <= 5) {
        score += 15; // 5살 이내
      } else if (ageDiff <= 10) {
        score += 10; // 10살 이내
      } else if (ageDiff <= 15) {
        score += 5; // 15살 이내
      }
    }

    // 4. 소개글 호환도 (0-20점)
    if (currentUser.bio && matchUser.bio) {
      const userBioLength = currentUser.bio.length;
      const matchBioLength = matchUser.bio.length;
      // 둘 다 소개글이 있으면 가점
      if (userBioLength > 10 && matchBioLength > 10) {
        score += 20;
      } else {
        score += 10;
      }
    }

    // 점수를 0-100 범위로 제한
    return Math.min(Math.round((score / maxScore) * 100), 100);
  };

  const handleSwipe = async (liked) => {
    if (currentIndex >= matches.length) {
      setCurrentIndex(0);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const match = matches[currentIndex];

      // 좋아요 API 호출
      await axios.post('/api/likes', {
        targetUserId: match.id,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 다음 사용자로 넘어가기
      setCurrentIndex(currentIndex + 1);
    } catch (error) {
      if (error.response?.status === 400) {
        alert(error.response.data.error);
        setCurrentIndex(currentIndex + 1);
      } else {
        console.error('오류:', error);
        alert('오류가 발생했습니다');
      }
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/auth/logout', {}, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      localStorage.removeItem('token');
      router.push('/login');
    } catch (error) {
      localStorage.removeItem('token');
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

  if (!user || matches.length === 0) {
    return (
      <>
        <TopNav />
        <div style={styles.container}>
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>매칭할 사용자가 없습니다</p>
          <p style={styles.emptyDesc}>다른 지역의 사용자를 검색해보세요</p>
          <button
            onClick={() => router.push('/search')}
            style={styles.primaryButton}
          >
            🔍 검색하기
          </button>
          <button
            onClick={() => router.push('/')}
            style={styles.secondaryButton}
          >
            🏠 홈으로
          </button>
        </div>
        </div>
      </>
    );
  }

  const currentMatch = matches[currentIndex];
  const compatibility = user ? calculateCompatibility(user, currentMatch) : 0;

  return (
    <>
      <TopNav />
      <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <h1 style={styles.title}>💕 매칭</h1>
        <p style={styles.subtitle}>AI가 추천하는 최적의 매칭을 찾아보세요</p>
      </div>

      {/* 사용자 정보 */}
      <div style={styles.userInfo}>
        <div style={styles.userDetail}>
          <span style={styles.userLabel}>사용자:</span>
          <span style={styles.userValue}>{user.email}</span>
        </div>
        <div style={styles.userDetail}>
          <span style={styles.userLabel}>포인트:</span>
          <span style={styles.userValue}>{user.points || 0} P</span>
        </div>
      </div>

      {/* 진행 상태 */}
      <div style={styles.progressSection}>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${((currentIndex + 1) / matches.length) * 100}%`,
            }}
          />
        </div>
        <p style={styles.progressText}>{currentIndex + 1} / {matches.length}</p>
      </div>

      {/* 매칭 카드 */}
      {currentMatch && (
        <div style={styles.card}>
          {/* 프로필 사진 */}
          <div style={styles.profileImage}>
            {currentMatch.profileImage ? (
              <img
                src={currentMatch.profileImage}
                alt={currentMatch.username || currentMatch.email}
                style={styles.image}
              />
            ) : (
              <div style={styles.placeholderImage}>
                📷 사진 없음
              </div>
            )}
          </div>

          {/* 기본 정보 */}
          <div style={styles.cardHeader}>
            <div style={styles.nameAge}>
              <h2 style={styles.name}>
                {currentMatch.username || currentMatch.email.split('@')[0]}
              </h2>
              <span style={styles.age}>{currentMatch.age}세</span>
            </div>
          </div>

          {/* 상세 정보 */}
          <div style={styles.cardBody}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>성별:</span>
              <span style={styles.infoValue}>{currentMatch.gender || '정보 없음'}</span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>지역:</span>
              <span style={styles.infoValue}>{currentMatch.region || '정보 없음'}</span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>MBTI:</span>
              <span style={styles.infoValue}>{currentMatch.mbti || '정보 없음'}</span>
            </div>

            {currentMatch.bio && (
              <div style={styles.bioSection}>
                <p style={styles.bioLabel}>자기소개:</p>
                <p style={styles.bioText}>{currentMatch.bio}</p>
              </div>
            )}

            {/* 호환도 */}
            <div style={styles.compatibilitySection}>
              <p style={styles.compatLabel}>호환도</p>
              <div style={styles.compatBar}>
                <div
                  style={{
                    ...styles.compatFill,
                    width: `${compatibility}%`,
                  }}
                />
              </div>
              <p style={styles.compatValue}>{compatibility}%</p>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div style={styles.buttonGroup}>
            <button
              onClick={() => handleSwipe(false)}
              style={styles.rejectButton}
            >
              ✕ 아니요
            </button>
            <button
              onClick={() => handleSwipe(true)}
              style={styles.likeButton}
            >
              💕 좋아요
            </button>
          </div>
        </div>
      )}

      {/* 로그아웃 */}
      <div style={styles.logoutSection}>
        <button onClick={handleLogout} style={styles.logoutButton}>
          로그아웃
        </button>
      </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
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
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    margin: '0',
  },
  userInfo: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
  },
  userDetail: {
    flex: 1,
  },
  userLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.7)',
    display: 'block',
    marginBottom: '5px',
  },
  userValue: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  progressSection: {
    marginBottom: '30px',
  },
  progressBar: {
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF2D55',
    transition: 'width 0.3s ease',
  },
  progressText: {
    color: 'white',
    textAlign: 'center',
    fontSize: '14px',
    margin: '0',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    marginBottom: '30px',
  },
  profileImage: {
    width: '100%',
    height: '350px',
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    fontSize: '18px',
    fontWeight: '600',
  },
  cardHeader: {
    padding: '20px',
    borderBottom: '1px solid #eee',
  },
  nameAge: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  name: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0',
  },
  age: {
    fontSize: '20px',
    color: '#667eea',
    fontWeight: '600',
  },
  cardBody: {
    padding: '20px',
  },
  infoRow: {
    display: 'flex',
    marginBottom: '15px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f0f0f0',
  },
  infoLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
    minWidth: '80px',
  },
  infoValue: {
    fontSize: '16px',
    color: '#333',
    fontWeight: '500',
  },
  bioSection: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '2px solid #f0f0f0',
  },
  bioLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
    margin: '0 0 10px 0',
  },
  bioText: {
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.6',
    margin: '0',
  },
  compatibilitySection: {
    marginTop: '25px',
    paddingTop: '20px',
    borderTop: '2px solid #667eea',
  },
  compatLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 12px 0',
  },
  compatBar: {
    height: '12px',
    backgroundColor: '#e0e0e0',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  compatFill: {
    height: '100%',
    backgroundColor: '#667eea',
    transition: 'width 0.3s ease',
  },
  compatValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#667eea',
    textAlign: 'center',
    margin: '0',
  },
  buttonGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    padding: '20px',
    borderTop: '1px solid #eee',
  },
  rejectButton: {
    padding: '14px 20px',
    backgroundColor: '#FF3B30',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  likeButton: {
    padding: '14px 20px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'white',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  emptyDesc: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '30px',
  },
  primaryButton: {
    display: 'inline-block',
    margin: '10px',
    padding: '12px 30px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  secondaryButton: {
    display: 'inline-block',
    margin: '10px',
    padding: '12px 30px',
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  logoutSection: {
    textAlign: 'center',
    marginTop: '20px',
  },
  logoutButton: {
    padding: '12px 40px',
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
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
