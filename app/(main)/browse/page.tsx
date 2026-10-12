'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import TopNav from '@/components/TopNav';
import ProfileCard from '@/components/ProfileCard';
import { useAuth } from '@/app/auth-context';
import { useLikeSystem } from '@/app/hooks/useLikeSystem';
import { useDiscoveryFeed } from '@/app/hooks/useDiscoveryFeed';
import { useLikeStats } from '@/app/hooks/useLikeStats';

export default function BrowsePage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const likeSystem = useLikeSystem();
  const discoveryFeed = useDiscoveryFeed();
  const likeStats = useLikeStats();
  const [isLoading, setIsLoading] = useState(true);
  const [compatibility, setCompatibility] = useState(0);

  useEffect(() => {
    if (!hydrated) return;

    const initializePage = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          router.push('/login');
          return;
        }

        await Promise.all([
          discoveryFeed.fetchRecommendedUsers(),
          likeStats.fetchDailyInfo(),
        ]);
        setIsLoading(false);
      } catch (error) {
        console.error('초기화 실패:', error);
        setIsLoading(false);
      }
    };

    initializePage();
  }, [hydrated, router]);

  const currentUser = discoveryFeed.getCurrentUser();

  const handleLike = async () => {
    if (!currentUser) return;
    const result = await likeSystem.sendLike(currentUser.id, 'like');
    if (result.success) {
      discoveryFeed.nextUser();
    }
  };

  const handleSuperLike = async () => {
    if (!currentUser) return;
    if (!likeStats.dailyInfo || likeStats.dailyInfo.remainingSuperLikes <= 0) {
      alert('슈퍼좋아요 한도를 초과했습니다');
      return;
    }
    const result = await likeSystem.sendLike(currentUser.id, 'superlike');
    if (result.success) {
      discoveryFeed.nextUser();
    }
  };

  const handlePass = async () => {
    if (!currentUser) return;
    const result = await likeSystem.sendPass(currentUser.id);
    if (result.success) {
      discoveryFeed.nextUser();
    }
  };

  if (isLoading) {
    return (
      <>
        <TopNav />
        <div style={styles.container}>
          <div style={styles.loadingSpinner}>
            <p>로딩 중...</p>
          </div>
        </div>
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        <TopNav />
        <div style={styles.container}>
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>추천 사용자가 없습니다</p>
            <p style={styles.emptyDesc}>다시 나중에 확인해주세요</p>
            <button
              onClick={() => router.push('/')}
              style={styles.homeButton}
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>💞 둘러보기</h1>
          <p style={styles.subtitle}>당신을 위한 추천 프로필</p>
        </div>

        {/* 통계 위젯 */}
        {likeStats.dailyInfo && (
          <div style={styles.statsWidget}>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>좋아요</span>
              <span style={styles.statValue}>
                {likeStats.dailyInfo.remainingLikes}/
                {likeStats.dailyInfo.isPremium ? 500 : 100}
              </span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>슈퍼좋아요</span>
              <span style={styles.statValue}>
                {likeStats.dailyInfo.remainingSuperLikes}/
                {likeStats.dailyInfo.isPremium ? 20 : 5}
              </span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>진행도</span>
              <span style={styles.statValue}>
                {discoveryFeed.currentIndex + 1}/{discoveryFeed.users.length}
              </span>
            </div>
          </div>
        )}

        {/* 프로필 카드 */}
        <div style={styles.cardContainer}>
          <ProfileCard
            user={currentUser}
            onLike={handleLike}
            onSuperLike={handleSuperLike}
            onPass={handlePass}
            loading={likeSystem.loading}
            compatibility={compatibility}
          />
        </div>

        {/* 오류 메시지 */}
        {likeSystem.error && (
          <div style={styles.errorMessage}>
            {likeSystem.error}
          </div>
        )}
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
    paddingBottom: '100px',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  header: {
    textAlign: 'center' as const,
    color: 'white',
    marginBottom: '30px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.8)',
    margin: '0',
  },
  statsWidget: {
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '30px',
    padding: '16px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
  },
  statItem: {
    textAlign: 'center' as const,
    color: 'white',
  },
  statLabel: {
    fontSize: '12px',
    display: 'block',
    marginBottom: '4px',
    opacity: 0.8,
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    display: 'block',
  },
  cardContainer: {
    marginBottom: '30px',
  },
  loadingSpinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: 'white',
    fontSize: '18px',
  },
  emptyState: {
    textAlign: 'center' as const,
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
    opacity: 0.8,
    marginBottom: '30px',
  },
  homeButton: {
    padding: '12px 30px',
    background: 'white',
    color: '#667eea',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  errorMessage: {
    background: 'rgba(255, 59, 48, 0.9)',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    textAlign: 'center' as const,
  },
};