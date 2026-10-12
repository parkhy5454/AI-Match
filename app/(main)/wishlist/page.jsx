'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function WishlistPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const LIMIT = 20;

  useEffect(() => {
    if (!hydrated) return;
    fetchWishlist();
  }, [hydrated, page]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `/api/wishlist?page=${page}&limit=${LIMIT}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLikes(response.data.data || []);
      if (response.data.meta) {
        setTotalPages(response.data.meta.pages || 1);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || '위시리스트 조회에 실패했습니다';
      setError(errorMsg);
      console.error('에러:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (likedUserId) => {
    if (!confirm('위시리스트에서 제거하시겠습니까?')) return;

    try {
      setError('');
      const token = localStorage.getItem('accessToken');

      await axios.delete(
        `/api/wishlist/${likedUserId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLikes(likes.filter(like => like.likedUserId !== likedUserId));
    } catch (err) {
      const errorMsg = err.response?.data?.error || '제거에 실패했습니다';
      setError(errorMsg);
    }
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
          <h1 style={styles.title}>❤️ 위시리스트</h1>
          <p style={styles.subtitle}>마음에 드는 사람들을 저장하세요</p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p>⚠️ {error}</p>
          </div>
        )}

        {likes.length > 0 ? (
          <>
            <div style={styles.wishlistGrid}>
              {likes.map((like) => (
                <div key={like.likedUserId} style={styles.profileCard}>
                  <div style={styles.profileImageContainer}>
                    {like.likedUser?.profileImage ? (
                      <img
                        src={like.likedUser.profileImage}
                        alt={like.likedUser.username}
                        style={styles.profileImage}
                      />
                    ) : (
                      <div style={styles.defaultImage}>
                        {like.likedUser?.username?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <div style={styles.profileInfo}>
                    <h3 style={styles.profileName}>
                      {like.likedUser?.username}
                    </h3>
                    {like.likedUser?.age && (
                      <p style={styles.profileDetail}>
                        {like.likedUser.age}세 • {like.likedUser.region}
                      </p>
                    )}
                    {like.likedUser?.mbti && (
                      <p style={styles.profileMBTI}>
                        {like.likedUser.mbti}
                      </p>
                    )}
                    {like.likedUser?.bio && (
                      <p style={styles.profileBio}>
                        {like.likedUser.bio}
                      </p>
                    )}
                  </div>
                  <div style={styles.actionButtons}>
                    <Link
                      href={`/discover/${like.likedUserId}`}
                      style={styles.viewButton}
                    >
                      프로필 보기
                    </Link>
                    <button
                      onClick={() => handleRemove(like.likedUserId)}
                      style={styles.removeButton}
                    >
                      제거
                    </button>
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
            <p style={styles.emptyIcon}>💔</p>
            <p style={styles.emptyText}>위시리스트가 비어있습니다</p>
            <p style={styles.emptySubtext}>마음에 드는 사람을 찾아보세요!</p>
            <Link href="/discover" style={styles.discoverLink}>
              사람 찾기
            </Link>
          </div>
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
  wishlistGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '30px',
  },
  profileCard: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
  },
  profileImageContainer: {
    width: '100%',
    height: '200px',
    background: '#eee',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  defaultImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#999',
  },
  profileInfo: {
    padding: '15px',
    flex: 1,
  },
  profileName: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 6px 0',
  },
  profileDetail: {
    fontSize: '12px',
    color: '#666',
    margin: '0 0 4px 0',
  },
  profileMBTI: {
    fontSize: '12px',
    color: '#667eea',
    fontWeight: '600',
    margin: '4px 0',
  },
  profileBio: {
    fontSize: '12px',
    color: '#999',
    margin: '6px 0 0 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    padding: '0 15px 15px 15px',
  },
  viewButton: {
    flex: 1,
    padding: '8px',
    background: '#667eea',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    textAlign: 'center',
    cursor: 'pointer',
  },
  removeButton: {
    flex: 1,
    padding: '8px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '15px',
  },
  pageButton: {
    padding: '8px 16px',
    background: 'white',
    color: '#667eea',
    border: '2px solid white',
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
    margin: '0 0 20px 0',
  },
  discoverLink: {
    display: 'inline-block',
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '14px',
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
