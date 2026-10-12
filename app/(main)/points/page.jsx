'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function PointsPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [currentPoints, setCurrentPoints] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const LIMIT = 20;

  useEffect(() => {
    if (!hydrated) return;
    fetchPoints();
  }, [hydrated, page]);

  const fetchPoints = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `/api/points?page=${page}&limit=${LIMIT}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCurrentPoints(response.data.data.currentPoints);
      setHistory(response.data.data.history || []);
      if (response.data.meta) {
        setTotalPages(response.data.meta.pages || 1);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || '포인트 정보 조회에 실패했습니다';
      setError(errorMsg);
      console.error('에러:', err);
    } finally {
      setLoading(false);
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
          <h1 style={styles.title}>⭐ 포인트</h1>
          <p style={styles.subtitle}>나의 포인트를 관리하세요</p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* 포인트 현황 */}
        <div style={styles.pointsSummary}>
          <div style={styles.pointsCard}>
            <p style={styles.pointsLabel}>현재 포인트</p>
            <p style={styles.pointsAmount}>{currentPoints.toLocaleString()}</p>
            <p style={styles.pointsHint}>포인트는 다양한 기능에 사용할 수 있습니다</p>
          </div>
        </div>

        {/* 포인트 사용 방법 */}
        <div style={styles.usageGuide}>
          <h2 style={styles.sectionTitle}>💡 포인트 사용처</h2>
          <div style={styles.usageGrid}>
            <div style={styles.usageCard}>
              <span style={styles.usageIcon}>💌</span>
              <h4>메시지 우선 배치</h4>
              <p>100 포인트</p>
            </div>
            <div style={styles.usageCard}>
              <span style={styles.usageIcon}>🎁</span>
              <h4>선물 전송</h4>
              <p>50-500 포인트</p>
            </div>
            <div style={styles.usageCard}>
              <span style={styles.usageIcon}>⭐</span>
              <h4>프로필 강조</h4>
              <p>200 포인트</p>
            </div>
            <div style={styles.usageCard}>
              <span style={styles.usageIcon}>📞</span>
              <h4>프리미엄 통화</h4>
              <p>150 포인트/분</p>
            </div>
          </div>
        </div>

        {/* 포인트 이력 */}
        <div style={styles.historySection}>
          <h2 style={styles.sectionTitle}>📋 포인트 이력</h2>

          {history.length > 0 ? (
            <>
              <div style={styles.historyTable}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>사유</th>
                      <th style={styles.th}>포인트</th>
                      <th style={styles.th}>날짜</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item, idx) => (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.td}>
                          <span style={{
                            color: item.amount > 0 ? '#28a745' : '#dc3545',
                            fontWeight: '600'
                          }}>
                            {item.reason}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            color: item.amount > 0 ? '#28a745' : '#dc3545',
                            fontWeight: 'bold'
                          }}>
                            {item.amount > 0 ? '+' : ''}{item.amount}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              <p style={styles.emptyText}>포인트 이력이 없습니다</p>
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
  pointsSummary: {
    marginBottom: '30px',
  },
  pointsCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  pointsLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    margin: '0 0 10px 0',
  },
  pointsAmount: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '10px 0',
  },
  pointsHint: {
    fontSize: '13px',
    color: '#999',
    margin: '10px 0 0 0',
  },
  usageGuide: {
    marginBottom: '30px',
  },
  usageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  usageCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  usageIcon: {
    fontSize: '32px',
    display: 'block',
    marginBottom: '10px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
    marginBottom: '15px',
    textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
  },
  historySection: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  historyTable: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    background: '#f8f9fa',
    borderBottom: '2px solid #ddd',
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#333',
  },
  tableRow: {
    borderBottom: '1px solid #f0f0f0',
  },
  td: {
    padding: '12px',
    fontSize: '13px',
    color: '#333',
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
