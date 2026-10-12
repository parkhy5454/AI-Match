'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

interface Like {
  id: string;
  fromUserId: string;
  user: {
    id: string;
    username: string;
    email: string;
    age: number;
    profileImage?: string;
    region: string;
    mbti: string;
  };
  likeType: 'like' | 'superlike';
  createdAt: string;
}

export default function LikesPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [likes, setLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    const fetchLikes = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await axios.get('/api/likes', {
          params: { type: 'received', limit: 50 },
        });
        setLikes(response.data.data || []);
      } catch (err: any) {
        setError(err.response?.data?.error || '좋아요 조회 실패');
      } finally {
        setLoading(false);
      }
    };

    fetchLikes();
  }, [hydrated, router]);

  if (loading) {
    return (
      <>
        <TopNav />
        <div style={styles.container}>
          <div style={styles.loadingSpinner}>로딩 중...</div>
        </div>
      </>
    );
  }

  if (likes.length === 0) {
    return (
      <>
        <TopNav />
        <div style={styles.container}>
          <div style={styles.header}>
            <h1 style={styles.title}>❤️ 받은 좋아요</h1>
          </div>
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>받은 좋아요가 없습니다</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>❤️ 받은 좋아요 ({likes.length})</h1>
        </div>

        {error && <div style={styles.errorMessage}>{error}</div>}

        <div style={styles.likesList}>
          {likes.map((like) => (
            <div key={like.id} style={styles.likeCard}>
              {like.user.profileImage && (
                <img
                  src={like.user.profileImage}
                  alt={like.user.username}
                  style={styles.image}
                />
              )}
              <div style={styles.content}>
                <h3 style={styles.name}>
                  {like.user.username || like.user.email.split('@')[0]}
                </h3>
                <p style={styles.info}>
                  {like.user.age}세 | {like.user.region} | {like.user.mbti}
                </p>
                <div style={styles.badge}>
                  {like.likeType === 'superlike' ? '⭐ 슈퍼좋아요' : '💕 좋아요'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    paddingTop: '100px',
    paddingBottom: '100px',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  header: {
    textAlign: 'center' as const,
    color: 'white',
    marginBottom: '30px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
  },
  likesList: {
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
  },
  likeCard: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.2s',
  },
  image: {
    width: '100%',
    height: '200px',
    objectFit: 'cover' as const,
  },
  content: {
    padding: '16px',
  },
  name: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 4px 0',
  },
  info: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 8px 0',
  },
  badge: {
    display: 'inline-block',
    background: '#FFE5E5',
    color: '#FF3B30',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  loadingSpinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: 'white',
    fontSize: '18px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: 'white',
  },
  emptyText: {
    fontSize: '18px',
    opacity: 0.8,
  },
  errorMessage: {
    background: 'rgba(255, 59, 48, 0.9)',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center' as const,
  },
};