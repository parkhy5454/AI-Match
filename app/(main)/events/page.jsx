'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function EventsPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('upcoming');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventDate: '',
    location: '',
    latitude: 0,
    longitude: 0,
    capacity: 10,
    coverImage: '',
  });

  const LIMIT = 20;

  useEffect(() => {
    if (!hydrated) return;
    fetchEvents();
  }, [hydrated, page, filter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `/api/events?page=${page}&limit=${LIMIT}&status=${filter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEvents(response.data.data || []);
      if (response.data.meta) {
        setTotalPages(response.data.meta.pages || 1);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || '이벤트 조회에 실패했습니다';
      setError(errorMsg);
      console.error('에러:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const token = localStorage.getItem('accessToken');

      const response = await axios.post(
        `/api/events`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEvents([response.data.data, ...events]);
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        eventDate: '',
        location: '',
        latitude: 0,
        longitude: 0,
        capacity: 10,
        coverImage: '',
      });
    } catch (err) {
      const errorMsg = err.response?.data?.error || '이벤트 생성에 실패했습니다';
      setError(errorMsg);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return '#667eea';
      case 'ongoing':
        return '#28a745';
      case 'ended':
        return '#999';
      case 'cancelled':
        return '#dc3545';
      default:
        return '#999';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'upcoming':
        return '예정';
      case 'ongoing':
        return '진행중';
      case 'ended':
        return '종료';
      case 'cancelled':
        return '취소됨';
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
          <h1 style={styles.title}>🎉 이벤트</h1>
          <p style={styles.subtitle}>새로운 사람들을 만나세요</p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* 이벤트 생성 버튼 */}
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={styles.createButton}
        >
          + 새 이벤트 만들기
        </button>

        {/* 이벤트 생성 폼 */}
        {showCreateForm && (
          <form onSubmit={handleCreateEvent} style={styles.createForm}>
            <input
              type="text"
              placeholder="이벤트 제목"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              style={styles.input}
              required
            />
            <textarea
              placeholder="이벤트 설명"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={styles.textarea}
              rows="4"
              required
            />
            <input
              type="datetime-local"
              value={formData.eventDate}
              onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
              style={styles.input}
              required
            />
            <input
              type="text"
              placeholder="장소"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              style={styles.input}
              required
            />
            <input
              type="number"
              placeholder="인원 제한"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
              style={styles.input}
              required
            />
            <div style={styles.formButtons}>
              <button type="submit" style={styles.submitButton}>생성</button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                style={styles.cancelButton}
              >
                취소
              </button>
            </div>
          </form>
        )}

        {/* 필터 */}
        <div style={styles.filterSection}>
          {['upcoming', 'ongoing', 'ended'].map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              style={{
                ...styles.filterButton,
                background: filter === f ? '#667eea' : 'white',
                color: filter === f ? 'white' : '#333',
              }}
            >
              {getStatusLabel(f)}
            </button>
          ))}
        </div>

        {/* 이벤트 목록 */}
        <div style={styles.eventsSection}>
          {events.length > 0 ? (
            <>
              <div style={styles.eventsList}>
                {events.map((event) => (
                  <div key={event.id} style={styles.eventCard}>
                    {event.coverImage && (
                      <div style={styles.eventCover}>
                        <img
                          src={event.coverImage}
                          alt={event.title}
                          style={styles.eventImage}
                        />
                      </div>
                    )}
                    <div style={styles.eventContent}>
                      <div style={styles.eventHeader}>
                        <h3 style={styles.eventTitle}>{event.title}</h3>
                        <span style={{
                          background: getStatusColor(event.status),
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}>
                          {getStatusLabel(event.status)}
                        </span>
                      </div>
                      <p style={styles.eventDescription}>{event.description}</p>
                      <div style={styles.eventDetails}>
                        <div style={styles.eventDetail}>
                          <span>📍</span>
                          <span>{event.location}</span>
                        </div>
                        <div style={styles.eventDetail}>
                          <span>📅</span>
                          <span>{new Date(event.eventDate).toLocaleDateString('ko-KR')}</span>
                        </div>
                        <div style={styles.eventDetail}>
                          <span>👥</span>
                          <span>{event.participants?.length || 0} / {event.capacity}</span>
                        </div>
                      </div>
                      <button style={styles.joinButton}>참여하기</button>
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
              <p style={styles.emptyIcon}>🎉</p>
              <p style={styles.emptyText}>이벤트가 없습니다</p>
              <p style={styles.emptySubtext}>새로운 이벤트를 만들어보세요!</p>
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
  createButton: {
    width: '100%',
    padding: '12px',
    background: 'white',
    color: '#667eea',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '20px',
  },
  createForm: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '15px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px',
    marginBottom: '15px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  formButtons: {
    display: 'flex',
    gap: '10px',
  },
  submitButton: {
    flex: 1,
    padding: '10px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelButton: {
    flex: 1,
    padding: '10px',
    background: '#ddd',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
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
  eventsSection: {
    marginBottom: '0',
  },
  eventsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  eventCard: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  eventCover: {
    height: '150px',
    overflow: 'hidden',
    background: '#eee',
  },
  eventImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  eventContent: {
    padding: '15px',
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: '8px',
  },
  eventTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#333',
    margin: '0',
    flex: 1,
  },
  eventDescription: {
    fontSize: '13px',
    color: '#666',
    margin: '8px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  eventDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '12px',
  },
  eventDetail: {
    fontSize: '12px',
    color: '#666',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  joinButton: {
    width: '100%',
    padding: '10px',
    background: '#667eea',
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
  loadingSpinner: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '20px',
    color: 'white',
  },
};
