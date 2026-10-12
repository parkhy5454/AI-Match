'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function BlockedUsersPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const LIMIT = 20;

  useEffect(() => {
    if (!hydrated) return;
    fetchBlockedUsers();
  }, [hydrated, page]);

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `/api/blocked-users?page=${page}&limit=${LIMIT}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBlockedUsers(response.data.data || []);
      if (response.data.meta) {
        setTotalPages(response.data.meta.pages || 1);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || '차단 목록 조회에 실패했습니다';
      setError(errorMsg);
      console.error('에러:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedUserId) => {
    if (!confirm('차단을 해제하시겠습니까?')) return;

    try {
      setError('');
      const token = localStorage.getItem('accessToken');

      await axios.delete(
        `/api/blocked-users/${blockedUserId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBlockedUsers(blockedUsers.filter(bu => bu.blockedUserId !== blockedUserId));
    } catch (err) {
      const errorMsg = err.response?.data?.error || '차단 해제에 실패했습니다';
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
          <h1 style={styles.title}>🚫 차단 목록</h1>
          <p style={styles.subtitle}>차단한 사용자를 관리하세요</p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* 차단 목록 */}
        {blockedUsers.length > 0 ? (
          <>
            <div style={styles.blockedList}>
              {blockedUsers.map((blocked) => (
                <div key={blocked.blockedUserId} style={styles.blockedCard}>
                  <div style={styles.userInfo}>
                    {blocked.blockedUser?.profileImage ? (
                      <img
                        src={blocked.blockedUser.profileImage}
                        alt={blocked.blockedUser.username}
                        style={styles.profileImage}
                      />
                    ) : (
                      <div style={styles.defaultImage}>
                        {blocked.blockedUser?.username?.charAt(0) || '?'}
                      </div>
                    )}
                    <div style={styles.userDetails}>
                      <h3 style={styles.userName}>{blocked.blockedUser?.username}</h3>
                      {blocked.blockedUser?.age && (
                        <p style={styles.userInfo2}>
                          {blocked.blockedUser.age}세 • {blocked.blockedUser.region}
                        </p>
                      )}
                      <p style={styles.blockDate}>
                        차단 날짜: {new Date(blocked.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblock(blocked.blockedUserId)}
                    style={styles.unblockButton}
                  >
                    차단 해제
                  </button>
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
            <p style={styles.emptyIcon}>🎉</p>
            <p style={styles.emptyText}>차단한 사용자가 없습니다</p>
          </div>
        )}
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
  blockedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  blockedCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  userInfo: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  defaultImage: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: '#eee',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#999',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 4px 0',
  },
  userInfo2: {
    fontSize: '13px',
    color: '#666',
    margin: '0 0 4px 0',
  },
  blockDate: {
    fontSize: '12px',
    color: '#999',
    margin: '0',
  },
  unblockButton: {
    padding: '8px 16px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
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
    fontSize: '16px',
    color: '#999',
    margin: '15px 0 0 0',
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
