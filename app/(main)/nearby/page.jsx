'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function NearbyPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [radius, setRadius] = useState(5);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (!hydrated) return;
    fetchNearbyUsers();
  }, [hydrated]);

  const fetchNearbyUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      // 사용자의 위치 가져오기
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });

          try {
            const response = await axios.get(
              `/api/nearby-users?latitude=${latitude}&longitude=${longitude}&radius=${radius}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            setUsers(response.data.data || []);
          } catch (err) {
            const errorMsg = err.response?.data?.error || '근처 사용자 조회에 실패했습니다';
            setError(errorMsg);
          } finally {
            setLoading(false);
          }
        }, () => {
          setError('위치 정보를 가져올 수 없습니다. 위치 권한을 확인하세요.');
          setLoading(false);
        });
      } else {
        setError('이 브라우저는 위치 서비스를 지원하지 않습니다.');
        setLoading(false);
      }
    } catch (err) {
      setError('오류가 발생했습니다');
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
          <h1 style={styles.title}>📍 근처 사용자</h1>
          <p style={styles.subtitle}>지도 기반으로 근처의 사용자를 찾으세요</p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* 위치 정보 */}
        {userLocation && (
          <div style={styles.locationCard}>
            <p style={styles.locationLabel}>📍 내 위치</p>
            <p style={styles.coordinates}>
              {userLocation.latitude.toFixed(4)}°, {userLocation.longitude.toFixed(4)}°
            </p>
          </div>
        )}

        {/* 반경 설정 */}
        <div style={styles.radiusSection}>
          <label style={styles.radiusLabel}>검색 반경: {radius}km</label>
          <input
            type="range"
            min="1"
            max="50"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            style={styles.radiusSlider}
          />
          <button
            onClick={fetchNearbyUsers}
            style={styles.refreshButton}
          >
            🔄 새로고침
          </button>
        </div>

        {/* 사용자 목록 */}
        <div style={styles.usersSection}>
          <h2 style={styles.sectionTitle}>👥 근처 사용자 ({users.length}명)</h2>

          {users.length > 0 ? (
            <div style={styles.usersGrid}>
              {users.map((user) => {
                const distance = userLocation
                  ? calculateDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      user.latitude,
                      user.longitude
                    )
                  : 0;

                return (
                  <div key={user.id} style={styles.userCard}>
                    {user.mainPhoto && (
                      <div style={styles.userPhotoContainer}>
                        <img
                          src={user.mainPhoto}
                          alt={user.username}
                          style={styles.userPhoto}
                        />
                      </div>
                    )}
                    <div style={styles.userContent}>
                      <h3 style={styles.userName}>
                        {user.username} {user.age && `(${user.age})`}
                      </h3>
                      <p style={styles.userLocation}>
                        {user.region}
                      </p>
                      <p style={styles.distance}>
                        📍 {distance.toFixed(1)}km 떨어짐
                      </p>
                      {user.mbti && (
                        <p style={styles.userMbti}>{user.mbti}</p>
                      )}
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => router.push(`/profile/${user.id}`)}
                          style={styles.viewButton}
                        >
                          프로필 보기
                        </button>
                        <button
                          onClick={() => router.push(`/messages?userId=${user.id}`)}
                          style={styles.messageButton}
                        >
                          메시지
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>🔍</p>
              <p style={styles.emptyText}>근처에 사용자가 없습니다</p>
              <p style={styles.emptySubtext}>반경을 늘려서 다시 시도해보세요</p>
            </div>
          )}
        </div>

        {/* 팁 */}
        <div style={styles.tipSection}>
          <h3 style={styles.tipTitle}>💡 팁</h3>
          <ul style={styles.tipList}>
            <li>정확한 위치 정보를 위해 GPS를 켜세요</li>
            <li>반경을 조절하여 더 많은 사용자를 발견할 수 있습니다</li>
            <li>마음에 드는 사용자와 매칭을 시도하세요</li>
            <li>안전한 만남을 위해 항상 공개 장소에서 만나세요</li>
          </ul>
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
  locationCard: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '15px 20px',
    marginBottom: '25px',
    color: 'white',
  },
  locationLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    margin: '0 0 5px 0',
    textTransform: 'uppercase',
  },
  coordinates: {
    fontSize: '14px',
    fontWeight: '600',
    margin: '0',
  },
  radiusSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  radiusLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '12px',
  },
  radiusSlider: {
    width: '100%',
    marginBottom: '15px',
    cursor: 'pointer',
  },
  refreshButton: {
    width: '100%',
    padding: '10px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  usersSection: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
    marginBottom: '15px',
    textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
  },
  usersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  userCard: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  userPhotoContainer: {
    height: '200px',
    overflow: 'hidden',
    background: '#eee',
  },
  userPhoto: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  userContent: {
    padding: '15px',
  },
  userName: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 5px 0',
  },
  userLocation: {
    fontSize: '13px',
    color: '#666',
    margin: '5px 0',
  },
  distance: {
    fontSize: '13px',
    color: '#667eea',
    fontWeight: '600',
    margin: '5px 0',
  },
  userMbti: {
    fontSize: '12px',
    color: '#999',
    margin: '5px 0',
  },
  actionButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginTop: '12px',
  },
  viewButton: {
    padding: '8px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  messageButton: {
    padding: '8px',
    background: '#28a745',
    color: 'white',
    border: 'none',
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
  tipSection: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '20px',
    color: 'white',
  },
  tipTitle: {
    fontSize: '16px',
    fontWeight: '700',
    margin: '0 0 15px 0',
  },
  tipList: {
    margin: '0',
    paddingLeft: '20px',
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
