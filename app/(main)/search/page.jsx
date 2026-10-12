'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import TopNav from '@/components/TopNav';

const REGIONS = [
  '서울', '경기', '인천', '대전', '세종', '충북', '충남',
  '전북', '전남', '광주', '대구', '경북', '경남', '부산', '울산', '제주'
];

const MBTI_TYPES = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'
];

export default function Search() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    keyword: '',
    minAge: '',
    maxAge: '',
    gender: '',
    region: '',
    mbti: ''
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      // 필터 데이터를 API 형식으로 변환
      const searchPayload = {
        ageMin: filters.minAge ? parseInt(filters.minAge) : 18,
        ageMax: filters.maxAge ? parseInt(filters.maxAge) : 100,
        genderPreference: filters.gender || undefined,
        regions: filters.region ? [filters.region] : [],
        mbti: filters.mbti ? [filters.mbti] : [],
        keyword: filters.keyword || undefined,
        limit: 20,
        offset: 0,
      };

      console.log('[Search] API 요청: /api/search/advanced', searchPayload);
      const response = await axios.post('/api/search/advanced', searchPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setResults(response.data.data || []);
      console.log('[Search] 검색 성공:', response.data.data?.length || 0, '명');
    } catch (error) {
      console.error('[Search] 검색 실패:', error);
      const errorMsg = error.response?.data?.error || error.message || '검색 실패했습니다';
      alert('검색 실패: ' + errorMsg);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (targetUserId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post('/api/likes', { toUserId: targetUserId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[Search] 좋아요 전송 성공:', targetUserId);
      alert('좋아요를 보냈습니다!');
    } catch (error) {
      console.error('[Search] 좋아요 실패:', error);
      const errorMsg = error.response?.data?.error || error.message || '좋아요 실패했습니다';
      alert('좋아요 실패: ' + errorMsg);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await axios.post('/api/auth/logout', {}, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      paddingTop: '80px',
      paddingBottom: '90px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      textAlign: 'center',
      color: 'white',
      marginBottom: '35px',
      paddingBottom: '20px',
    },
    title: {
      fontSize: '36px',
      fontWeight: 'bold',
      color: 'white',
      margin: '0 0 10px 0',
    },
    headerSubtitle: {
      fontSize: '14px',
      color: 'rgba(255,255,255,0.8)',
      margin: '0',
    },
    filterSection: {
      backgroundColor: 'white',
      padding: '28px',
      borderRadius: '14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      marginBottom: '35px'
    },
    filterForm: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '20px'
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '8px',
      color: '#333'
    },
    input: {
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'inherit',
      transition: 'border-color 0.3s'
    },
    select: {
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'inherit',
      backgroundColor: 'white',
      cursor: 'pointer'
    },
    buttonGroup: {
      display: 'flex',
      gap: '10px'
    },
    searchButton: {
      padding: '12px 30px',
      backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      background: '#667eea',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    resetButton: {
      padding: '12px 30px',
      backgroundColor: '#e0e0e0',
      color: '#333',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    resultsSection: {
      marginTop: '30px'
    },
    resultCount: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '20px',
      padding: '0 5px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
      gap: '20px'
    },
    userCard: {
      backgroundColor: 'white',
      borderRadius: '14px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      transition: 'all 0.3s'
    },
    profileImage: {
      width: '100%',
      height: '200px',
      backgroundColor: '#f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#999',
      fontSize: '14px',
      fontWeight: '600'
    },
    img: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    },
    userInfo: {
      padding: '15px'
    },
    email: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#333',
      marginBottom: '10px',
      wordBreak: 'break-word'
    },
    details: {
      fontSize: '13px',
      color: '#666',
      marginBottom: '8px',
      lineHeight: '1.4'
    },
    bio: {
      fontSize: '12px',
      color: '#999',
      marginBottom: '12px',
      maxHeight: '60px',
      overflow: 'hidden',
      wordBreak: 'break-word',
      lineHeight: '1.3'
    },
    likeButton: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#667eea',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    noResults: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#999',
      fontSize: '16px'
    },
    loadingSpinner: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#999'
    }
  };

  return (
    <>
      <TopNav />
      <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <h1 style={styles.title}>🔍 검색</h1>
        <p style={styles.headerSubtitle}>조건에 맞는 사용자를 찾아보세요</p>
      </div>

      {/* 필터 섹션 */}
      <div style={styles.filterSection}>
        <form onSubmit={handleSearch} style={styles.filterForm}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>키워드</label>
            <input
              type="text"
              name="keyword"
              value={filters.keyword}
              onChange={handleFilterChange}
              placeholder="이름 또는 소개 검색"
              style={styles.input}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>나이 (최소)</label>
            <input
              type="number"
              name="minAge"
              value={filters.minAge}
              onChange={handleFilterChange}
              min="18"
              max="100"
              placeholder="최소 나이"
              style={styles.input}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>나이 (최대)</label>
            <input
              type="number"
              name="maxAge"
              value={filters.maxAge}
              onChange={handleFilterChange}
              min="18"
              max="100"
              placeholder="최대 나이"
              style={styles.input}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>성별</label>
            <select
              name="gender"
              value={filters.gender}
              onChange={handleFilterChange}
              style={styles.select}
            >
              <option value="">전체 성별</option>
              <option value="남성">남성</option>
              <option value="여성">여성</option>
              <option value="기타">기타</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>지역</label>
            <select
              name="region"
              value={filters.region}
              onChange={handleFilterChange}
              style={styles.select}
            >
              <option value="">전체 지역</option>
              {REGIONS.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>MBTI</label>
            <select
              name="mbti"
              value={filters.mbti}
              onChange={handleFilterChange}
              style={styles.select}
            >
              <option value="">전체 MBTI</option>
              {MBTI_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div style={{...styles.filterGroup, gridColumn: 'span 1'}}>
            <label style={{...styles.label, visibility: 'hidden'}}>버튼</label>
            <div style={styles.buttonGroup}>
              <button
                type="submit"
                disabled={loading}
                style={{...styles.searchButton, opacity: loading ? 0.6 : 1}}
              >
                {loading ? '검색 중...' : '검색'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters({ keyword: '', minAge: '', maxAge: '', gender: '', region: '', mbti: '' });
                  setResults([]);
                  setSearched(false);
                }}
                style={styles.resetButton}
              >
                초기화
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 검색 결과 */}
      <div style={styles.resultsSection}>
        {searched && (
          <div style={styles.resultCount}>
            검색 결과: {results.length}명
          </div>
        )}

        {loading && (
          <div style={styles.loadingSpinner}>
            검색 중...
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div style={styles.noResults}>
            검색 결과가 없습니다.
          </div>
        )}

        {results.length > 0 && (
          <div style={styles.grid}>
            {results.map(user => (
              <div key={user.id} style={styles.userCard}>
                <div style={styles.profileImage}>
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.email} style={styles.img} />
                  ) : (
                    '프로필 사진 없음'
                  )}
                </div>
                <div style={styles.userInfo}>
                  <div style={styles.email}>{user.email.split('@')[0]}</div>
                  <div style={styles.details}>
                    {user.age && <div>나이: {user.age}세</div>}
                    {user.gender && <div>성별: {user.gender}</div>}
                    {user.region && <div>지역: {user.region}</div>}
                    {user.mbti && <div>MBTI: {user.mbti}</div>}
                  </div>
                  {user.bio && (
                    <div style={styles.bio}>{user.bio}</div>
                  )}
                  <button
                    onClick={() => handleLike(user.id)}
                    style={styles.likeButton}
                  >
                    ❤️ 좋아요
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </>
  );
}
