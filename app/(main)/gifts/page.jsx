'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function GiftsPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all');

  const LIMIT = 12;

  useEffect(() => {
    if (!hydrated) return;
    fetchGifts();
  }, [hydrated, page, filter]);

  const fetchGifts = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `/api/gift?page=${page}&limit=${LIMIT}&status=${filter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGifts(response.data.data || []);
      if (response.data.meta) {
        setTotalPages(response.data.meta.pages || 1);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || '선물 조회에 실패했습니다';
      setError(errorMsg);
      console.error('에러:', err);
    } finally {
      setLoading(false);
    }
  };

  const giftTypes = {
    flower: { icon: '🌹', name: '꽃' },
    ring: { icon: '💍', name: '반지' },
    necklace: { icon: '📿', name: '목걸이' },
    bracelet: { icon: '⌚', name: '팔찌' },
    heart: { icon: '💝', name: '하트' },
    kiss: { icon: '💋', name: '키스' },
    diamond: { icon: '💎', name: '다이아몬드' },
    teddy: { icon: '🧸', name: '테디베어' },
  };

  if (loading && page === 1) {
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
          <h1 style={styles.title}>🎁 선물</h1>
          <p style={styles.subtitle}>받은 선물을 확인하세요</p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* 통계 */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>받은 선물</p>
            <p style={styles.statValue}>{gifts.length}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>가장 많이 받은 선물</p>
            <p style={styles.statValue}>
              {gifts.length > 0 ?
                Object.entries(
                  gifts.reduce((acc, g) => {
                    acc[g.type] = (acc[g.type] || 0) + 1;
                    return acc;
                  }, {})
                ).sort((a, b) => b[1] - a[1])[0][0]
                : '-'
              }
            </p>
          </div>
        </div>

        {/* 필터 */}
        <div style={styles.filterSection}>
          <button
            onClick={() => {
              setFilter('all');
              setPage(1);
            }}
            style={{
              ...styles.filterButton,
              background: filter === 'all' ? '#667eea' : 'white',
              color: filter === 'all' ? 'white' : '#333',
            }}
          >
            전체
          </button>
          <button
            onClick={() => {
              setFilter('received');
              setPage(1);
            }}
            style={{
              ...styles.filterButton,
              background: filter === 'received' ? '#667eea' : 'white',
              color: filter === 'received' ? 'white' : '#333',
            }}
          >
            받은 선물
          </button>
          <button
            onClick={() => {
              setFilter('sent');
              setPage(1);
            }}
            style={{
              ...styles.filterButton,
              background: filter === 'sent' ? '#667eea' : 'white',
              color: filter === 'sent' ? 'white' : '#333',
            }}
          >
            보낸 선물
          </button>
        </div>

        {/* 선물 목록 */}
        <div style={styles.giftsSection}>
          {gifts.length > 0 ? (
            <>
              <div style={styles.giftsGrid}>
                {gifts.map((gift) => (
                  <div key={gift.id} style={styles.giftCard}>
                    <div style={styles.giftIconContainer}>
                      <span style={styles.giftIcon}>
                        {giftTypes[gift.type]?.icon || '🎁'}
                      </span>
                    </div>
                    <div style={styles.giftContent}>
                      <h4 style={styles.giftName}>
                        {giftTypes[gift.type]?.name || gift.type}
                      </h4>
                      <p style={styles.giftFrom}>
                        {gift.direction === 'received'
                          ? `${gift.sender?.username}에게 받음`
                          : `${gift.recipient?.username}에게 보냄`
                        }
                      </p>
                      <p style={styles.giftDate}>
                        {new Date(gift.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                      {gift.message && (
                        <p style={styles.giftMessage}>"{gift.message}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div style={styles.pagination}>
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    style={{
                      ...styles.pageButton,
                      opacity: page === 1 ? 0.5 : 1,
                    }}
                  >
                    ← 이전
                  </button>
                  <span style={styles.pageInfo}>
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    style={{
                      ...styles.pageButton,
                      opacity: page === totalPages ? 0.5 : 1,
                    }}
                  >
                    다음 →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>🎁</p>
              <p style={styles.emptyText}>아직 받은 선물이 없습니다</p>
              <p style={styles.emptySubtext}>누군가가 당신을 좋아할 때까지 기다려보세요!</p>
            </div>
          )}
        </div>

        {/* 선물 가이드 */}
        <div style={styles.guideSection}>
          <h2 style={styles.guideTitle}>💝 선물이란?</h2>
          <p style={styles.guideText}>
            선물은 다른 사용자에게 당신의 마음을 표현하는 방법입니다.
            포인트를 사용하여 다양한 선물을 보낼 수 있으며,
            받은 선물의 개수와 종류로 인기도가 올라갑니다.
          </p>
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '15px',
    marginBottom: '25px',
  },
  statCard: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    color: 'white',
  },
  statLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0',
  },
  filterSection: {
    display: 'flex',
    gap: '10px',
    marginBottom: '25px',
    justifyContent: 'center',
  },
  filterButton: {
    padding: '8px 16px',
    border: '2px solid white',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  giftsSection: {
    marginBottom: '30px',
  },
  giftsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '15px',
  },
  giftCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  giftIconContainer: {
    marginBottom: '15px',
  },
  giftIcon: {
    fontSize: '48px',
    display: 'block',
  },
  giftContent: {
    textAlign: 'center',
  },
  giftName: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 8px 0',
  },
  giftFrom: {
    fontSize: '13px',
    color: '#667eea',
    margin: '0 0 5px 0',
    fontWeight: '600',
  },
  giftDate: {
    fontSize: '12px',
    color: '#999',
    margin: '0 0 8px 0',
  },
  giftMessage: {
    fontSize: '12px',
    color: '#666',
    margin: '8px 0 0 0',
    fontStyle: 'italic',
    borderTop: '1px solid #eee',
    paddingTop: '8px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '15px',
    marginTop: '25px',
  },
  pageButton: {
    padding: '8px 16px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  pageInfo: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
  },
  emptyState: {
    background: 'white',
    borderRadius: '12px',
    padding: '60px 20px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  emptyIcon: {
    fontSize: '48px',
    margin: '0',
    display: 'block',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: '15px 0 10px 0',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#999',
    margin: '0',
  },
  guideSection: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '25px',
    color: 'white',
  },
  guideTitle: {
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 15px 0',
  },
  guideText: {
    fontSize: '14px',
    margin: '0',
    lineHeight: '1.6',
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
