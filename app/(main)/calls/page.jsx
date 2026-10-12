'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function CallsPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all');

  const LIMIT = 20;

  useEffect(() => {
    if (!hydrated) return;
    fetchCalls();
  }, [hydrated, page, filter]);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `/api/calls?page=${page}&limit=${LIMIT}&type=${filter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCalls(response.data.data || []);
      if (response.data.meta) {
        setTotalPages(response.data.meta.pages || 1);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || '통화 이력 조회에 실패했습니다';
      setError(errorMsg);
      console.error('에러:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDurationLabel = (duration) => {
    if (!duration) return '-';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}분 ${seconds}초`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#28a745';
      case 'pending':
        return '#ffc107';
      case 'declined':
        return '#dc3545';
      case 'missed':
        return '#ffc107';
      default:
        return '#667eea';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return '완료';
      case 'pending':
        return '대기중';
      case 'declined':
        return '거절';
      case 'missed':
        return '미응답';
      default:
        return status;
    }
  };

  const getCallTypeIcon = (type) => {
    return type === 'video' ? '📹' : '📞';
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
          <h1 style={styles.title}>📞 통화</h1>
          <p style={styles.subtitle}>통화 이력을 확인하세요</p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p>⚠️ {error}</p>
          </div>
        )}

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
              setFilter('incoming');
              setPage(1);
            }}
            style={{
              ...styles.filterButton,
              background: filter === 'incoming' ? '#667eea' : 'white',
              color: filter === 'incoming' ? 'white' : '#333',
            }}
          >
            받은 통화
          </button>
          <button
            onClick={() => {
              setFilter('outgoing');
              setPage(1);
            }}
            style={{
              ...styles.filterButton,
              background: filter === 'outgoing' ? '#667eea' : 'white',
              color: filter === 'outgoing' ? 'white' : '#333',
            }}
          >
            건 통화
          </button>
        </div>

        {/* 통화 이력 */}
        <div style={styles.historySection}>
          <h2 style={styles.sectionTitle}>📋 통화 이력</h2>

          {calls.length > 0 ? (
            <>
              <div style={styles.callsList}>
                {calls.map((call) => (
                  <div key={call.id} style={styles.callCard}>
                    <div style={styles.callContent}>
                      <div style={styles.callIcon}>
                        {getCallTypeIcon(call.type)}
                      </div>
                      <div style={styles.callInfo}>
                        <div style={styles.callHeader}>
                          <h4 style={styles.callUser}>
                            {call.type === 'incoming'
                              ? call.caller?.username
                              : call.recipient?.username}
                          </h4>
                          <span style={{
                            background: getStatusColor(call.status),
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                          }}>
                            {getStatusLabel(call.status)}
                          </span>
                        </div>
                        <p style={styles.callType}>
                          {call.type === 'video' ? '비디오 통화' : '음성 통화'} • {call.type === 'incoming' ? '수신' : '발신'}
                        </p>
                        <div style={styles.callDetails}>
                          <span style={styles.callDuration}>
                            {getDurationLabel(call.duration)}
                          </span>
                          <span style={styles.callDate}>
                            {new Date(call.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>
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
              <p style={styles.emptyIcon}>📭</p>
              <p style={styles.emptyText}>통화 이력이 없습니다</p>
            </div>
          )}
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
  historySection: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '15px',
  },
  callsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  callCard: {
    background: '#f9f9f9',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #eee',
  },
  callContent: {
    display: 'flex',
    gap: '12px',
  },
  callIcon: {
    fontSize: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '50px',
  },
  callInfo: {
    flex: 1,
  },
  callHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  callUser: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#333',
    margin: '0',
  },
  callType: {
    fontSize: '12px',
    color: '#666',
    margin: '4px 0',
  },
  callDetails: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
  },
  callDuration: {
    color: '#667eea',
    fontWeight: '600',
  },
  callDate: {
    color: '#999',
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
    color: '#333',
    fontSize: '14px',
    fontWeight: '600',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  emptyIcon: {
    fontSize: '48px',
    margin: '0',
    display: 'block',
  },
  emptyText: {
    fontSize: '14px',
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
