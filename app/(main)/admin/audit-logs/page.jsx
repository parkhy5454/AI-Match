'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function AuditLogsPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all'); // all, success, failed
  const [type, setType] = useState('login_attempt');

  const LIMIT = 20;

  useEffect(() => {
    if (!hydrated) {
      console.log('[AuditLogs] AuthContext 하이드레이션 대기 중...');
      return;
    }

    fetchLogs();
  }, [hydrated, page, filter, type]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: LIMIT.toString(),
        type,
        status: filter,
      });

      console.log('[AuditLogs] API 요청: /api/admin/audit-logs');
      const response = await axios.get(`/api/admin/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setLogs(response.data.data || []);
      if (response.data.meta) {
        setTotalPages(response.data.meta.pages || 1);
      }
      console.log('[AuditLogs] 데이터 로드 성공');
    } catch (err) {
      if (err.response?.status === 403) {
        setError('관리자 권한이 필요합니다');
      } else if (err.response?.status === 401) {
        router.push('/login');
      } else {
        const errorMsg = err.response?.data?.error || '감시 로그 로드에 실패했습니다';
        setError(errorMsg);
        console.error('[AuditLogs] API 에러:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (log) => {
    if (log.type === 'login_attempt') {
      return {
        label: log.success ? '성공' : '실패',
        color: log.success ? '#28a745' : '#dc3545',
      };
    }
    return { label: '기타', color: '#999' };
  };

  const getStatusReason = (reason) => {
    const reasons = {
      invalid_password: '잘못된 비밀번호',
      user_not_found: '사용자 없음',
      account_locked: '계정 잠금',
      account_suspended: '계정 정지',
      account_blocked: '계정 차단',
    };
    return reasons[reason] || reason || '성공';
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

  if (error) {
    return (
      <>
        <TopNav />
        <div style={styles.container}>
          <div style={styles.pageHeader}>
            <Link href="/admin/dashboard" style={styles.backLink}>
              ← 뒤로 가기
            </Link>
            <h1 style={styles.title}>📝 감시 로그</h1>
          </div>
          <div style={styles.errorCard}>
            <p>⚠️ {error}</p>
          </div>
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
          <Link href="/admin/dashboard" style={styles.backLink}>
            ← 뒤로 가기
          </Link>
          <h1 style={styles.title}>📝 감시 로그</h1>
          <p style={styles.subtitle}>로그인 시도 및 활동 기록</p>
        </div>

        {/* 필터 */}
        <div style={styles.filterSection}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>로그 타입</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              style={styles.select}
            >
              <option value="login_attempt">로그인 시도</option>
              <option value="all">모든 로그</option>
            </select>
          </div>

          {type === 'login_attempt' && (
            <div style={styles.filterGroup}>
              <label style={styles.label}>상태</label>
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
                style={styles.select}
              >
                <option value="all">전체</option>
                <option value="success">성공</option>
                <option value="failed">실패</option>
              </select>
            </div>
          )}
        </div>

        {/* 로그 목록 */}
        {logs.length > 0 ? (
          <>
            <div style={styles.logsSection}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>날짜/시간</th>
                    <th style={styles.th}>이메일</th>
                    <th style={styles.th}>IP 주소</th>
                    <th style={styles.th}>상태</th>
                    <th style={styles.th}>사유</th>
                    <th style={styles.th}>User Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const badge = getStatusBadge(log);
                    return (
                      <tr key={log.id} style={styles.tableRow}>
                        <td style={styles.td}>
                          {new Date(log.createdAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td style={styles.td}>{log.email}</td>
                        <td style={styles.td}>{log.ipAddress || '-'}</td>
                        <td style={styles.td}>
                          <span style={{...styles.badge, background: badge.color}}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {getStatusReason(log.reason)}
                        </td>
                        <td style={{...styles.td, fontSize: '12px', color: '#999', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                          {log.userAgent || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
            <p style={styles.emptyIcon}>📝</p>
            <p style={styles.emptyText}>기록이 없습니다</p>
            <p style={styles.emptySubtext}>선택한 필터에 해당하는 로그가 없습니다</p>
          </div>
        )}

        {/* 통계 */}
        {logs.length > 0 && type === 'login_attempt' && (
          <div style={styles.statsSection}>
            <h3 style={styles.statsTitle}>📊 통계</h3>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>성공한 로그인</p>
                <p style={styles.statValue}>
                  {logs.filter(l => l.success).length}
                </p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>실패한 로그인</p>
                <p style={styles.statValue}>
                  {logs.filter(l => !l.success).length}
                </p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>실패율</p>
                <p style={styles.statValue}>
                  {logs.length > 0
                    ? Math.round((logs.filter(l => !l.success).length / logs.length) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
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
  },
  filterSection: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '25px',
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    minWidth: '150px',
  },
  logsSection: {
    background: 'white',
    borderRadius: '12px',
    marginBottom: '25px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
    padding: '15px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#333',
    textTransform: 'uppercase',
  },
  tableRow: {
    borderBottom: '1px solid #f0f0f0',
    transition: 'background 0.2s',
  },
  td: {
    padding: '12px 15px',
    fontSize: '14px',
    color: '#333',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '4px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '25px',
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
  statsSection: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
  },
  statsTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 15px 0',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
  },
  statCard: {
    padding: '20px',
    background: '#f9f9f9',
    borderRadius: '8px',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    margin: '0 0 8px 0',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '0',
  },
  emptyState: {
    background: 'white',
    padding: '60px 20px',
    borderRadius: '12px',
    textAlign: 'center',
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
