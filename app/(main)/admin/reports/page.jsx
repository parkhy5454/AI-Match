'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function AdminReportsPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);
  const [actionData, setActionData] = useState({});

  const LIMIT = 15;
  const STATUS_OPTIONS = ['pending', 'investigating', 'resolved', 'dismissed'];
  const ACTION_OPTIONS = [null, 'suspended', 'blocked', 'warned'];

  useEffect(() => {
    if (!hydrated) {
      console.log('[AdminReports] AuthContext 하이드레이션 대기 중...');
      return;
    }

    fetchReports();
  }, [hydrated, page, filter]);

  const fetchReports = async () => {
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
        status: filter !== 'all' ? filter : undefined,
      });

      console.log('[AdminReports] API 요청: /api/admin/reports');
      const response = await axios.get(`/api/admin/reports?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setReports(response.data.data || []);
      if (response.data.meta) {
        setTotalPages(response.data.meta.pages || 1);
      }
      console.log('[AdminReports] 데이터 로드 성공');
    } catch (err) {
      if (err.response?.status === 403) {
        setError('관리자 권한이 필요합니다');
      } else if (err.response?.status === 401) {
        router.push('/login');
      } else {
        const errorMsg = err.response?.data?.error || '신고 목록 로드에 실패했습니다';
        setError(errorMsg);
        console.error('[AdminReports] API 에러:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProcessReport = async (reportId, newStatus, action) => {
    try {
      setProcessing(true);

      const token = localStorage.getItem('accessToken');
      console.log('[AdminReports] 신고 처리:', reportId, newStatus, action);

      const response = await axios.put(
        `/api/admin/reports/${reportId}`,
        {
          status: newStatus,
          action: action || null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('[AdminReports] 처리 완료:', response.data);

      // 목록 갱신
      await fetchReports();
      setExpandedId(null);
      setActionData({});
    } catch (err) {
      const errorMsg = err.response?.data?.error || '신고 처리에 실패했습니다';
      alert('오류: ' + errorMsg);
      console.error('[AdminReports] 처리 에러:', err);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      investigating: '#17a2b8',
      resolved: '#28a745',
      dismissed: '#6c757d',
    };
    return colors[status] || '#999';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: '검토 중',
      investigating: '조사 중',
      resolved: '해결됨',
      dismissed: '기각됨',
    };
    return labels[status] || status;
  };

  const getActionLabel = (action) => {
    const labels = {
      suspended: '계정 정지',
      blocked: '계정 차단',
      warned: '경고',
    };
    return labels[action] || action;
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
            <h1 style={styles.title}>🚨 신고 관리</h1>
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
          <h1 style={styles.title}>🚨 신고 관리</h1>
          <p style={styles.subtitle}>사용자 신고 검토 및 처리</p>
        </div>

        {/* 필터 */}
        <div style={styles.filterSection}>
          <label style={styles.filterLabel}>상태:</label>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            style={styles.filterSelect}
          >
            <option value="all">모두</option>
            <option value="pending">검토 중</option>
            <option value="investigating">조사 중</option>
            <option value="resolved">해결됨</option>
            <option value="dismissed">기각됨</option>
          </select>
        </div>

        {/* 신고 목록 */}
        {reports.length > 0 ? (
          <>
            <div style={styles.reportsSection}>
              {reports.map((report) => (
                <div key={report.id} style={styles.reportCard}>
                  <div
                    style={styles.reportHeader}
                    onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                  >
                    <div style={styles.reportInfo}>
                      <span style={{...styles.badge, background: getStatusColor(report.status)}}>
                        {getStatusLabel(report.status)}
                      </span>
                      <div style={styles.reportUsers}>
                        <p style={styles.reportTitle}>
                          {report.reporter.username} → {report.reportedUser.username}
                        </p>
                        <p style={styles.reportSubtext}>
                          신고자: {report.reporter.email} | 대상: {report.reportedUser.email}
                        </p>
                      </div>
                    </div>
                    <div style={styles.reportReason}>
                      <span style={styles.reasonBadge}>{report.reason}</span>
                    </div>
                  </div>

                  {expandedId === report.id && (
                    <div style={styles.reportDetails}>
                      <div style={styles.detailsGrid}>
                        <div style={styles.detailItem}>
                          <p style={styles.detailLabel}>신고 사유</p>
                          <p style={styles.detailValue}>{report.reason}</p>
                        </div>
                        <div style={styles.detailItem}>
                          <p style={styles.detailLabel}>신고 날짜</p>
                          <p style={styles.detailValue}>
                            {new Date(report.createdAt).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <div style={styles.detailItem}>
                          <p style={styles.detailLabel}>신고 대상 신고 횟수</p>
                          <p style={styles.detailValue}>{report.reportedUser.reportCount}</p>
                        </div>
                        <div style={styles.detailItem}>
                          <p style={styles.detailLabel}>신고 대상 계정 상태</p>
                          <p style={styles.detailValue}>{report.reportedUser.accountStatus}</p>
                        </div>
                      </div>

                      {report.description && (
                        <div style={styles.description}>
                          <p style={styles.descLabel}>상세 설명</p>
                          <p style={styles.descText}>{report.description}</p>
                        </div>
                      )}

                      {report.action && (
                        <div style={styles.actionInfo}>
                          <p style={styles.actionLabel}>취한 조치: {getActionLabel(report.action)}</p>
                        </div>
                      )}

                      {report.status !== 'resolved' && report.status !== 'dismissed' && (
                        <div style={styles.actionSection}>
                          <p style={styles.actionTitle}>조치 선택</p>
                          <div style={styles.actionGrid}>
                            <div style={styles.actionOption}>
                              <label style={styles.actionLabel2}>
                                <input
                                  type="radio"
                                  name={`status-${report.id}`}
                                  value="investigating"
                                  checked={actionData[report.id]?.status === 'investigating'}
                                  onChange={(e) =>
                                    setActionData({
                                      ...actionData,
                                      [report.id]: { ...actionData[report.id], status: e.target.value },
                                    })
                                  }
                                />
                                조사 중으로 변경
                              </label>
                            </div>
                            <div style={styles.actionOption}>
                              <label style={styles.actionLabel2}>
                                <input
                                  type="radio"
                                  name={`status-${report.id}`}
                                  value="resolved"
                                  checked={actionData[report.id]?.status === 'resolved'}
                                  onChange={(e) =>
                                    setActionData({
                                      ...actionData,
                                      [report.id]: { ...actionData[report.id], status: e.target.value },
                                    })
                                  }
                                />
                                해결됨으로 변경
                              </label>
                            </div>
                            <div style={styles.actionOption}>
                              <label style={styles.actionLabel2}>
                                <input
                                  type="radio"
                                  name={`status-${report.id}`}
                                  value="dismissed"
                                  checked={actionData[report.id]?.status === 'dismissed'}
                                  onChange={(e) =>
                                    setActionData({
                                      ...actionData,
                                      [report.id]: { ...actionData[report.id], status: e.target.value },
                                    })
                                  }
                                />
                                기각됨으로 변경
                              </label>
                            </div>
                          </div>

                          <p style={styles.actionTitle}>추가 조치</p>
                          <div style={styles.actionGrid}>
                            {ACTION_OPTIONS.map((action) => (
                              <div key={action} style={styles.actionOption}>
                                <label style={styles.actionLabel2}>
                                  <input
                                    type="radio"
                                    name={`action-${report.id}`}
                                    value={action || ''}
                                    checked={actionData[report.id]?.action === action}
                                    onChange={(e) =>
                                      setActionData({
                                        ...actionData,
                                        [report.id]: {
                                          ...actionData[report.id],
                                          action: action,
                                        },
                                      })
                                    }
                                  />
                                  {action ? getActionLabel(action) : '조치 없음'}
                                </label>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={() =>
                              handleProcessReport(
                                report.id,
                                actionData[report.id]?.status || report.status,
                                actionData[report.id]?.action
                              )
                            }
                            disabled={processing}
                            style={{
                              ...styles.submitButton,
                              opacity: processing ? 0.6 : 1,
                            }}
                          >
                            {processing ? '처리 중...' : '저장'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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
            <p style={styles.emptyIcon}>✅</p>
            <p style={styles.emptyText}>신고가 없습니다</p>
            <p style={styles.emptySubtext}>모든 신고가 처리되었습니다</p>
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
    padding: '15px 20px',
    borderRadius: '12px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '150px',
  },
  reportsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '25px',
  },
  reportCard: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  reportHeader: {
    padding: '18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    backgroundColor: '#fafafa',
  },
  reportInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flex: 1,
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    color: 'white',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  reportUsers: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  reportTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#333',
    margin: '0',
  },
  reportSubtext: {
    fontSize: '12px',
    color: '#999',
    margin: '0',
  },
  reportReason: {
    marginLeft: 'auto',
  },
  reasonBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    background: '#f0f0f0',
    color: '#333',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
  },
  reportDetails: {
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderTop: '1px solid #eee',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    margin: '0',
  },
  detailValue: {
    fontSize: '14px',
    color: '#333',
    margin: '0',
  },
  description: {
    padding: '15px',
    background: 'white',
    borderRadius: '8px',
    marginBottom: '20px',
    borderLeft: '3px solid #667eea',
  },
  descLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
    margin: '0 0 8px 0',
  },
  descText: {
    fontSize: '14px',
    color: '#333',
    margin: '0',
    lineHeight: '1.5',
  },
  actionInfo: {
    padding: '10px 15px',
    background: '#e7f3ff',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  actionLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#0066cc',
  },
  actionSection: {
    padding: '20px',
    background: 'white',
    borderRadius: '8px',
    marginTop: '20px',
  },
  actionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 12px 0',
  },
  actionGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px',
  },
  actionOption: {
    display: 'flex',
    alignItems: 'center',
  },
  actionLabel2: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#333',
    cursor: 'pointer',
    margin: '0',
  },
  submitButton: {
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
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
