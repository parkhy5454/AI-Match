'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function ReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hydrated } = useAuth();
  const [reportForm, setReportForm] = useState({
    reportedUserId: searchParams.get('userId') || '',
    reason: '',
    description: '',
  });
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const REASONS = [
    { value: 'spam', label: '스팸/광고' },
    { value: 'inappropriate', label: '부적절한 콘텐츠' },
    { value: 'scam', label: '사기/거짓' },
    { value: 'abuse', label: '학대/폭력' },
    { value: 'other', label: '기타' },
  ];

  const LIMIT = 10;

  useEffect(() => {
    if (!hydrated) {
      console.log('[Report] AuthContext 하이드레이션 대기 중...');
      return;
    }

    fetchReports();
  }, [hydrated, page]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('[Report] API 요청: /api/report');
      const response = await axios.get(`/api/report?page=${page}&limit=${LIMIT}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setReports(response.data.data || []);
      if (response.data.meta) {
        setTotalPages(response.data.meta.pages || 1);
      }
      console.log('[Report] 데이터 로드 성공');
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('[Report] 인증 실패, 로그인 페이지로 이동');
        router.push('/login');
      } else {
        const errorMsg = err.response?.data?.error || '신고 목록 로드에 실패했습니다';
        setError(errorMsg);
        console.error('[Report] API 에러:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setReportForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (!reportForm.reportedUserId || !reportForm.reason) {
        setError('신고 대상과 신고 사유는 필수입니다');
        setSubmitting(false);
        return;
      }

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('[Report] 신고 제출:', reportForm);
      const response = await axios.post('/api/report', reportForm, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('[Report] 신고 완료:', response.data);
      setSuccess('✅ ' + response.data.message);

      // 폼 초기화
      setReportForm({
        reportedUserId: '',
        reason: '',
        description: '',
      });
      setShowForm(false);

      // 목록 갱신
      await fetchReports();

      // 3초 후 메시지 자동 사라지기
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || '신고 제출에 실패했습니다';
      setError(errorMsg);
      console.error('[Report] 제출 에러:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getReasonLabel = (reason) => {
    return REASONS.find(r => r.value === reason)?.label || reason;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: '검토 중', color: '#ffc107' },
      investigating: { label: '조사 중', color: '#17a2b8' },
      resolved: { label: '해결됨', color: '#28a745' },
      dismissed: { label: '기각됨', color: '#6c757d' },
    };
    return statusMap[status] || { label: status, color: '#999' };
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
          <h1 style={styles.title}>🚨 신고</h1>
          <p style={styles.subtitle}>부적절한 사용자를 신고해주세요</p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p style={{ margin: 0 }}>⚠️ {error}</p>
          </div>
        )}

        {success && (
          <div style={styles.successCard}>
            <p style={{ margin: 0 }}>{success}</p>
          </div>
        )}

        {/* 신고 버튼 */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={styles.reportButton}
          >
            + 새 신고 작성
          </button>
        )}

        {/* 신고 폼 */}
        {showForm && (
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>신고 작성</h2>
            <form onSubmit={handleSubmitReport} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>신고 대상 (사용자 ID)</label>
                <input
                  type="text"
                  name="reportedUserId"
                  value={reportForm.reportedUserId}
                  onChange={handleFormChange}
                  placeholder="신고할 사용자의 ID를 입력하세요"
                  style={styles.input}
                  disabled={submitting}
                />
                <p style={styles.hint}>프로필에서 사용자 ID를 확인할 수 있습니다</p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>신고 사유 *</label>
                <select
                  name="reason"
                  value={reportForm.reason}
                  onChange={handleFormChange}
                  style={styles.input}
                  disabled={submitting}
                >
                  <option value="">선택하세요</option>
                  {REASONS.map(r => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>상세 설명</label>
                <textarea
                  name="description"
                  value={reportForm.description}
                  onChange={handleFormChange}
                  placeholder="신고 사유를 자세히 설명해주세요 (선택 사항)"
                  style={{...styles.input, ...styles.textarea}}
                  maxLength="500"
                  disabled={submitting}
                  rows="4"
                />
                <span style={styles.charCount}>
                  {reportForm.description.length} / 500
                </span>
              </div>

              <div style={styles.buttonGroup}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    ...styles.submitButton,
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? '제출 중...' : '신고 제출'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={styles.cancelButton}
                  disabled={submitting}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 신고 이력 */}
        {reports.length > 0 ? (
          <>
            <div style={styles.historySection}>
              <h2 style={styles.sectionTitle}>📋 신고 이력</h2>
              <div style={styles.reportsList}>
                {reports.map(report => (
                  <div key={report.id} style={styles.reportCard}>
                    <div style={styles.reportHeader}>
                      <div style={styles.reportUser}>
                        <div style={styles.userInfo}>
                          <p style={styles.username}>
                            {report.reportedUser.username}
                            <span style={{...styles.badge, background: getStatusBadge(report.status).color}}>
                              {getStatusBadge(report.status).label}
                            </span>
                          </p>
                          <p style={styles.email}>{report.reportedUser.email}</p>
                        </div>
                      </div>
                      <div style={styles.reportMeta}>
                        <span style={styles.reason}>
                          {getReasonLabel(report.reason)}
                        </span>
                      </div>
                    </div>

                    {report.description && (
                      <p style={styles.description}>
                        {report.description}
                      </p>
                    )}

                    <div style={styles.reportFooter}>
                      <span style={styles.timestamp}>
                        {new Date(report.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {report.action && (
                        <span style={styles.action}>
                          조치: {report.action === 'suspended' ? '정지' :
                                 report.action === 'blocked' ? '차단' :
                                 report.action === 'warned' ? '경고' : report.action}
                        </span>
                      )}
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
            </div>
          </>
        ) : (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>🚨</p>
            <p style={styles.emptyText}>신고 이력이 없습니다</p>
            <p style={styles.emptySubtext}>부적절한 사용자를 발견하면 신고해주세요</p>
          </div>
        )}

        {/* 안내 섹션 */}
        <div style={styles.guideCard}>
          <h2 style={styles.guideTitle}>💡 신고 가이드</h2>
          <ul style={styles.guideList}>
            <li><strong>정확한 사유 선택:</strong> 신고가 더 빠르게 처리됩니다</li>
            <li><strong>증거 제시:</strong> 상세한 설명으로 신고의 신뢰도를 높입니다</li>
            <li><strong>거짓 신고:</strong> 악의적인 신고는 규정 위반이 될 수 있습니다</li>
            <li><strong>처리 시간:</strong> 신고는 24-48시간 내에 검토됩니다</li>
          </ul>
        </div>
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
    marginBottom: '20px',
  },
  successCard: {
    background: 'rgba(40, 167, 69, 0.9)',
    color: 'white',
    padding: '15px 20px',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  reportButton: {
    padding: '12px 20px',
    background: 'white',
    color: '#667eea',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '25px',
  },
  formCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  formTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 20px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  textarea: {
    resize: 'vertical',
    minHeight: '100px',
  },
  hint: {
    fontSize: '12px',
    color: '#999',
    margin: '0',
    fontStyle: 'italic',
  },
  charCount: {
    fontSize: '12px',
    color: '#999',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
  },
  submitButton: {
    flex: 1,
    padding: '12px 20px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelButton: {
    flex: 1,
    padding: '12px 20px',
    background: '#ddd',
    color: '#333',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  historySection: {
    marginBottom: '25px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
    marginBottom: '15px',
    textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
  },
  reportsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  reportCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '15px',
  },
  reportUser: {
    flex: 1,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  username: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#333',
    margin: '0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  email: {
    fontSize: '13px',
    color: '#999',
    margin: '0',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'white',
    borderRadius: '4px',
  },
  reason: {
    display: 'inline-block',
    padding: '4px 12px',
    background: '#f0f0f0',
    color: '#333',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
  },
  description: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 12px 0',
    lineHeight: '1.5',
    padding: '10px',
    background: '#f9f9f9',
    borderRadius: '6px',
    borderLeft: '3px solid #667eea',
  },
  reportFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: '#999',
  },
  timestamp: {
    fontSize: '12px',
    color: '#999',
  },
  action: {
    padding: '2px 8px',
    background: '#e7f3ff',
    color: '#0066cc',
    borderRadius: '4px',
    fontSize: '11px',
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
    padding: '60px 20px',
    borderRadius: '12px',
    textAlign: 'center',
    marginBottom: '25px',
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
  guideCard: {
    background: 'rgba(255,255,255,0.95)',
    padding: '25px',
    borderRadius: '12px',
  },
  guideTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 15px 0',
  },
  guideList: {
    margin: '0',
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#333',
    lineHeight: '1.8',
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
