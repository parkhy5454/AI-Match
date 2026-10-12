'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function NotificationsPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all'); // all, unread, like, match, message

  const LIMIT = 20;

  useEffect(() => {
    if (!hydrated) {
      console.log('[Notifications] AuthContext 하이드레이션 대기 중...');
      return;
    }

    fetchNotifications();
  }, [hydrated, page, filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('[Notifications] API 요청: /api/notifications');
      const response = await axios.get(
        `/api/notifications?page=${page}&limit=${LIMIT}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      let filteredNotifications = response.data.data || [];

      // 필터 적용
      if (filter === 'unread') {
        filteredNotifications = filteredNotifications.filter(n => !n.isRead);
      } else if (filter !== 'all') {
        filteredNotifications = filteredNotifications.filter(n => n.type === filter);
      }

      setNotifications(filteredNotifications);
      if (response.data.meta) {
        setTotalPages(response.data.meta.pages || 1);
      }
      console.log('[Notifications] 데이터 조회 성공:', filteredNotifications.length);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('[Notifications] 인증 실패, 로그인 페이지로 이동');
        router.push('/login');
      } else {
        const errorMsg = err.response?.data?.error || '알림 조회에 실패했습니다';
        setError(errorMsg);
        console.error('[Notifications] API 에러:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.put(`/api/notifications/${notificationId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      console.log('[Notifications] 알림 읽음 표시:', notificationId);
    } catch (err) {
      console.error('[Notifications] 읽음 표시 에러:', err);
    }
  };

  const handleDelete = async (notificationId) => {
    if (!confirm('이 알림을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      console.log('[Notifications] 알림 삭제됨:', notificationId);
    } catch (err) {
      console.error('[Notifications] 삭제 에러:', err);
      setError('알림 삭제에 실패했습니다');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return '❤️';
      case 'match':
        return '💕';
      case 'message':
        return '💬';
      case 'system':
        return 'ℹ️';
      default:
        return '🔔';
    }
  };

  const getNotificationLabel = (type) => {
    switch (type) {
      case 'like':
        return '좋아요';
      case 'match':
        return '매칭';
      case 'message':
        return '메시지';
      case 'system':
        return '시스템';
      default:
        return '알림';
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
        {/* 페이지 제목 */}
        <div style={styles.pageHeader}>
          <Link href="/dashboard" style={styles.backLink}>
            ← 뒤로 가기
          </Link>
          <h1 style={styles.title}>🔔 알림</h1>
          <p style={styles.subtitle}>
            {notifications.length > 0
              ? `총 ${notifications.length}개의 알림`
              : '알림이 없습니다'}
          </p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p style={{ margin: 0 }}>⚠️ {error}</p>
          </div>
        )}

        {/* 필터 버튼들 */}
        <div style={styles.filterSection}>
          {['all', 'unread', 'like', 'match', 'message'].map(filterOption => (
            <button
              key={filterOption}
              onClick={() => {
                setFilter(filterOption);
                setPage(1);
              }}
              style={{
                ...styles.filterButton,
                ...(filter === filterOption ? styles.filterButtonActive : {}),
              }}
            >
              {filterOption === 'all' && '전체'}
              {filterOption === 'unread' && '읽지 않음'}
              {filterOption === 'like' && '❤️ 좋아요'}
              {filterOption === 'match' && '💕 매칭'}
              {filterOption === 'message' && '💬 메시지'}
            </button>
          ))}
        </div>

        {/* 알림 목록 */}
        {notifications.length > 0 ? (
          <>
            <div style={styles.notificationsList}>
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  style={{
                    ...styles.notificationCard,
                    ...(notification.isRead ? {} : styles.notificationCardUnread),
                  }}
                >
                  <div style={styles.notificationContent}>
                    <div style={styles.notificationIcon}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div style={styles.notificationText}>
                      <div style={styles.notificationTitle}>
                        {notification.title}
                        {!notification.isRead && <span style={styles.unreadBadge}>NEW</span>}
                      </div>
                      <div style={styles.notificationBody}>
                        {notification.body}
                      </div>
                      <div style={styles.notificationMeta}>
                        <span style={styles.typeLabel}>
                          {getNotificationLabel(notification.type)}
                        </span>
                        <span style={styles.timestamp}>
                          {new Date(notification.createdAt).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={styles.notificationActions}>
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        style={styles.actionButton}
                        title="읽음 표시"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      style={styles.deleteButton}
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  style={{
                    ...styles.pageButton,
                    opacity: page === 1 ? 0.5 : 1,
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
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
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  다음 →
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>🔔</p>
            <p style={styles.emptyText}>알림이 없습니다</p>
            <p style={styles.emptySubtext}>
              좋아요, 매칭, 메시지가 발생하면 알림이 표시됩니다
            </p>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
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
    transition: 'color 0.2s',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    marginBottom: '5px',
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
    marginBottom: '20px',
    border: '1px solid rgba(220, 53, 69, 0.5)',
  },
  filterSection: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    background: 'white',
    color: '#667eea',
    border: '2px solid white',
  },
  notificationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  notificationCard: {
    background: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    transition: 'all 0.2s',
  },
  notificationCardUnread: {
    background: 'rgba(255,255,255,0.95)',
    borderLeft: '4px solid #667eea',
  },
  notificationContent: {
    display: 'flex',
    gap: '12px',
    flex: 1,
  },
  notificationIcon: {
    fontSize: '24px',
    minWidth: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  notificationTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  unreadBadge: {
    background: '#667eea',
    color: 'white',
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  notificationBody: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.4',
  },
  notificationMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#999',
  },
  typeLabel: {
    background: '#f0f0f0',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#555',
  },
  timestamp: {
    fontSize: '12px',
    color: '#999',
  },
  notificationActions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  actionButton: {
    padding: '6px 10px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '32px',
  },
  deleteButton: {
    padding: '6px 10px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '32px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '15px',
    marginTop: '30px',
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
    transition: 'all 0.2s',
  },
  pageInfo: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
  },
  emptyState: {
    background: 'white',
    padding: '60px 20px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  emptyIcon: {
    fontSize: '48px',
    margin: '0',
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
  loadingSpinner: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '20px',
    color: 'white',
  },
};
