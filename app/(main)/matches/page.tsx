'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import TopNav from '@/components/TopNav';
import MatchCard from '@/components/MatchCard';
import LikeStats from '@/components/LikeStats';
import { useAuth } from '@/app/auth-context';
import { useMatches } from '@/app/hooks/useMatches';
import { useLikeStats } from '@/app/hooks/useLikeStats';

export default function MatchesPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const matches = useMatches();
  const likeStats = useLikeStats();
  const [loading, setLoading] = useState(true);

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
          matches.fetchMatches(),
          likeStats.fetchStats(),
        ]);
      } catch (error) {
        console.error('초기화 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [hydrated, router]);

  const handleMatchClick = (matchId: string) => {
    router.push(`/messages?matchId=${matchId}`);
  };

  const handleUnmatch = async (matchId: string) => {
    if (confirm('이 매칭을 해제하시겠습니까?')) {
      await matches.unmatch(matchId);
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
        <div style={styles.header}>
          <h1 style={styles.title}>💑 내 매칭 ({matches.matches.length})</h1>
          <p style={styles.subtitle}>매칭된 사용자와 대화를 시작하세요</p>
        </div>

        {likeStats.stats && (
          <LikeStats
            totalMatches={likeStats.stats.totalMatches}
            totalLikesReceived={likeStats.stats.totalLikesReceived}
          />
        )}

        {matches.matches.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>아직 매칭이 없습니다</p>
            <p style={styles.emptyDesc}>주변 사람들을 둘러보고 관심을 표현하세요</p>
            <button
              onClick={() => router.push('/browse')}
              style={styles.browseButton}
            >
              🔍 둘러보기
            </button>
          </div>
        ) : (
          <div style={styles.matchesList}>
            {matches.matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onClick={() => handleMatchClick(match.id)}
                onUnmatch={() => handleUnmatch(match.id)}
              />
            ))}
          </div>
        )}

        {matches.error && (
          <div style={styles.errorMessage}>{matches.error}</div>
        )}
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '1000px',
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
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.8)',
    margin: '0',
  },
  matchesList: {
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px',
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
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '60px 20px',
    textAlign: 'center' as const,
    color: 'white',
    marginTop: '30px',
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
  browseButton: {
    padding: '12px 30px',
    background: '#667eea',
    color: 'white',
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
    marginTop: '20px',
    textAlign: 'center' as const,
  },
};