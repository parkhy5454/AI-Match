'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function PhotosPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    fetchPhotos();
  }, [hydrated]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `/api/photos`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPhotos(response.data.data || []);
    } catch (err) {
      const errorMsg = err.response?.data?.error || '사진 조회에 실패했습니다';
      setError(errorMsg);
      console.error('에러:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      const reader = new FileReader();

      reader.onload = async (event) => {
        const base64 = event.target?.result;
        try {
          const response = await axios.post(
            `/api/photos`,
            { imageData: base64 },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          setPhotos([...photos, response.data.data]);
          if (e.target) e.target.value = '';
        } catch (err) {
          const errorMsg = err.response?.data?.error || '사진 업로드에 실패했습니다';
          setError(errorMsg);
        } finally {
          setUploading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError('파일 처리에 실패했습니다');
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      setError('');
      const token = localStorage.getItem('accessToken');

      await axios.delete(
        `/api/photos/${photoId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPhotos(photos.filter(p => p.id !== photoId));
    } catch (err) {
      const errorMsg = err.response?.data?.error || '사진 삭제에 실패했습니다';
      setError(errorMsg);
    }
  };

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

  return (
    <>
      <TopNav />
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <Link href="/dashboard" style={styles.backLink}>
            ← 뒤로 가기
          </Link>
          <h1 style={styles.title}>📸 사진</h1>
          <p style={styles.subtitle}>프로필 사진을 관리하세요</p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* 사진 업로드 */}
        <div style={styles.uploadSection}>
          <label style={styles.uploadBox}>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <div style={styles.uploadContent}>
              <span style={styles.uploadIcon}>📷</span>
              <p style={styles.uploadText}>
                {uploading ? '업로드 중...' : '사진을 선택하거나 드래그하세요'}
              </p>
              <p style={styles.uploadSubtext}>
                최대 10장까지 업로드 가능합니다
              </p>
            </div>
          </label>
        </div>

        {/* 사진 현황 */}
        <div style={styles.statusSection}>
          <div style={styles.statusCard}>
            <p style={styles.statusLabel}>보유 사진</p>
            <p style={styles.statusValue}>{photos.length} / 10</p>
          </div>
          <div style={styles.statusCard}>
            <p style={styles.statusLabel}>프로필 사진</p>
            <p style={styles.statusValue}>
              {photos.find(p => p.isMain) ? '설정됨' : '미설정'}
            </p>
          </div>
        </div>

        {/* 사진 갤러리 */}
        {photos.length > 0 ? (
          <div style={styles.photosSection}>
            <h2 style={styles.sectionTitle}>🖼️ 내 사진</h2>
            <div style={styles.photosGrid}>
              {photos.map((photo) => (
                <div key={photo.id} style={styles.photoCard}>
                  <div style={styles.photoImageContainer}>
                    <img
                      src={photo.imageUrl}
                      alt="Profile photo"
                      style={styles.photoImage}
                    />
                    {photo.isMain && (
                      <div style={styles.mainBadge}>프로필 사진</div>
                    )}
                  </div>
                  <div style={styles.photoInfo}>
                    <p style={styles.photoDate}>
                      {new Date(photo.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      style={styles.deleteButton}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>📭</p>
            <p style={styles.emptyText}>아직 사진이 없습니다</p>
            <p style={styles.emptySubtext}>사진을 업로드하여 프로필을 완성하세요!</p>
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
  uploadSection: {
    marginBottom: '25px',
  },
  uploadBox: {
    display: 'block',
    background: 'white',
    border: '2px dashed #667eea',
    borderRadius: '12px',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  uploadContent: {
    pointerEvents: 'none',
  },
  uploadIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '15px',
  },
  uploadText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 5px 0',
  },
  uploadSubtext: {
    fontSize: '13px',
    color: '#999',
    margin: '0',
  },
  statusSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '25px',
  },
  statusCard: {
    background: 'white',
    padding: '15px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  statusLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    margin: '0 0 5px 0',
  },
  statusValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '0',
  },
  photosSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '15px',
  },
  photosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '12px',
  },
  photoCard: {
    background: '#f9f9f9',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  photoImageContainer: {
    position: 'relative',
    paddingBottom: '100%',
    background: '#eee',
    overflow: 'hidden',
  },
  photoImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  mainBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: '#667eea',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600',
  },
  photoInfo: {
    padding: '12px',
  },
  photoDate: {
    fontSize: '12px',
    color: '#999',
    margin: '0 0 8px 0',
  },
  deleteButton: {
    width: '100%',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
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
