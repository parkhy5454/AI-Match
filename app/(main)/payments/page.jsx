'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function PaymentsPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const LIMIT = 20;

  useEffect(() => {
    if (!hydrated) return;
    fetchPayments();
  }, [hydrated, page]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `/api/payments?page=${page}&limit=${LIMIT}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPayments(response.data.data || []);
      if (response.data.meta) {
        setTotalPages(response.data.meta.pages || 1);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || '결제 이력 조회에 실패했습니다';
      setError(errorMsg);
      console.error('에러:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#28a745';
      case 'pending':
        return '#ffc107';
      case 'failed':
        return '#dc3545';
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
      case 'failed':
        return '실패';
      default:
        return status;
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
          <h1 style={styles.title}>💳 결제</h1>
          <p style={styles.subtitle}>결제 이력을 확인하세요</p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* 포인트 충전 안내 */}
        <div style={styles.chargeGuide}>
          <h2 style={styles.sectionTitle}>💰 포인트 충전</h2>
          <div style={styles.chargeGrid}>
            <div style={styles.chargeCard}>
              <h4>100포인트</h4>
              <p style={styles.chargePrice}>₩11,000</p>
              <button style={styles.chargeButton}>충전하기</button>
            </div>
            <div style={styles.chargeCard}>
              <h4>500포인트</h4>
              <p style={styles.chargePrice}>₩50,000</p>
              <button style={styles.chargeButton}>충전하기</button>
            </div>
            <div style={styles.chargeCard}>
              <h4>1000포인트</h4>
              <p style={styles.chargePrice}>₩90,000</p>
              <button style={styles.chargeButton}>충전하기</button>
            </div>
          </div>
        </div>

        {/* 결제 이력 */}
        <div style={styles.historySection}>
          <h2 style={styles.sectionTitle}>📋 결제 이력</h2>

          {payments.length > 0 ? (
            <>
              <div style={styles.historyTable}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>항목</th>
                      <th style={styles.th}>금액</th>
                      <th style={styles.th}>상태</th>
                      <th style={styles.th}>날짜</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment, idx) => (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.td}>
                          <div>
                            <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#333' }}>
                              {payment.reason}
                            </p>
                            <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
                              ID: {payment.transactionId || '-'}
                            </p>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{ fontWeight: 'bold' }}>
                            ₩{payment.amount.toLocaleString()}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            background: getStatusColor(payment.status),
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'inline-block'
                          }}>
                            {getStatusLabel(payment.status)}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {new Date(payment.createdAt).toLocaleDateString('ko-KR')}
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
              <p style={styles.emptyText}>결제 이력이 없습니다</p>
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
  chargeGuide: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
    marginBottom: '15px',
    textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
  },
  chargeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  chargeCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  chargePrice: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '10px 0',
  },
  chargeButton: {
    background: '#667eea',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    marginTop: '10px',
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
