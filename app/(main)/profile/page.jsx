'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import TopNav from '@/components/TopNav';

export default function ProfileEdit() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    region: '',
    mbti: '',
    bio: '',
    profileImage: null,
  });

  const mbtiTypes = [
    'INTJ', 'INTP', 'ENTJ', 'ENTP',
    'INFJ', 'INFP', 'ENFJ', 'ENFP',
    'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
    'ISTP', 'ISFP', 'ESTP', 'ESFP',
  ];

  const regions = [
    '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
    '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
  ];

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await axios.get('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(response.data);
        setFormData({
          age: response.data.age || '',
          gender: response.data.gender || '',
          region: response.data.region || '',
          mbti: response.data.mbti || '',
          bio: response.data.bio || '',
          profileImage: null,
        });
        if (response.data.profileImage) {
          setPreviewImage(response.data.profileImage);
        }
        setLoading(false);
      } catch (error) {
        console.error('프로필 조회 실패:', error);
        router.push('/login');
      }
    };

    fetchUser();
  }, [router]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 파일 크기 확인 (5MB 이하)
      if (file.size > 5 * 1024 * 1024) {
        setMessage('❌ 이미지 크기는 5MB 이하여야 합니다.');
        return;
      }

      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        setFormData(prev => ({
          ...prev,
          profileImage: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 유효성 검사
    if (!formData.age) {
      setMessage('❌ 나이를 입력해주세요.');
      return;
    }
    if (formData.age < 18 || formData.age > 100) {
      setMessage('❌ 나이는 18~100 사이여야 합니다.');
      return;
    }
    if (!formData.region) {
      setMessage('❌ 지역을 선택해주세요.');
      return;
    }
    if (!formData.mbti) {
      setMessage('❌ MBTI를 선택해주세요.');
      return;
    }
    if (!formData.bio) {
      setMessage('❌ 자기소개를 입력해주세요.');
      return;
    }

    try {
      setSaving(true);
      setMessage('저장 중...');

      const token = localStorage.getItem('token');
      const response = await axios.post('/api/profile', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      setUser(response.data);
      setMessage('✅ 프로필이 성공적으로 저장되었습니다!');
      setTimeout(() => {
        setMessage('');
      }, 3000);
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
      setMessage('❌ 프로필 저장에 실패했습니다. ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/auth/logout', {}, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      localStorage.removeItem('token');
      router.push('/login');
    } catch (error) {
      localStorage.removeItem('token');
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingSpinner}>로딩 중...</div>
      </div>
    );
  }

  return (
    <>
      <TopNav />
      <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <h1 style={styles.title} onClick={() => router.push('/')}>AI-Match</h1>
        <p style={styles.subtitle}>당신의 완벽한 매칭을 찾아보세요</p>
      </div>

      {/* 페이지 제목 */}
      <div style={styles.pageHeader}>
        <h2 style={styles.pageTitle}>프로필 수정</h2>
        <p style={styles.pageSubtitle}>당신의 정보를 업데이트하세요</p>
      </div>

      {/* 사용자 이메일 */}
      {user && (
        <div style={styles.emailCard}>
          <p><strong>계정:</strong> {user.email}</p>
        </div>
      )}

      {/* 메시지 */}
      {message && (
        <div style={{
          ...styles.messageBox,
          background: message.includes('✅') ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)',
          borderColor: message.includes('✅') ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)',
        }}>
          {message}
        </div>
      )}

      {/* 프로필 양식 */}
      <form onSubmit={handleSubmit} style={styles.form}>
        {/* 프로필 사진 */}
        <div style={styles.formSection}>
          <h3 style={styles.sectionTitle}>📸 프로필 사진</h3>

          <div style={styles.imageUploadBox}>
            {previewImage && (
              <div style={styles.previewContainer}>
                <img
                  src={previewImage}
                  alt="프로필 미리보기"
                  style={styles.previewImage}
                />
              </div>
            )}

            <div style={styles.uploadInputContainer}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={styles.fileInput}
                id="imageInput"
              />
              <label htmlFor="imageInput" style={styles.uploadLabel}>
                {previewImage ? '📸 이미지 변경' : '📸 이미지 선택'}
              </label>
              <p style={styles.uploadHint}>
                JPG, PNG (최대 5MB)
              </p>
            </div>
          </div>
        </div>

        {/* 나이 */}
        <div style={styles.formSection}>
          <label style={styles.label}>
            <span style={styles.labelText}>나이</span>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              min="18"
              max="100"
              style={styles.input}
              placeholder="나이를 입력하세요 (18-100)"
            />
          </label>
        </div>

        {/* 성별 */}
        <div style={styles.formSection}>
          <label style={styles.label}>
            <span style={styles.labelText}>성별</span>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              style={styles.select}
            >
              <option value="">성별을 선택하세요</option>
              <option value="남성">남성</option>
              <option value="여성">여성</option>
              <option value="기타">기타</option>
            </select>
          </label>
        </div>

        {/* 지역 */}
        <div style={styles.formSection}>
          <label style={styles.label}>
            <span style={styles.labelText}>지역</span>
            <select
              name="region"
              value={formData.region}
              onChange={handleChange}
              style={styles.select}
            >
              <option value="">지역을 선택하세요</option>
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </label>
        </div>

        {/* MBTI */}
        <div style={styles.formSection}>
          <label style={styles.label}>
            <span style={styles.labelText}>MBTI</span>
            <select
              name="mbti"
              value={formData.mbti}
              onChange={handleChange}
              style={styles.select}
            >
              <option value="">MBTI를 선택하세요</option>
              {mbtiTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
        </div>

        {/* 자기소개 */}
        <div style={styles.formSection}>
          <label style={styles.label}>
            <span style={styles.labelText}>자기소개</span>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              style={styles.textarea}
              placeholder="자신을 소개해주세요 (최대 500자)"
              maxLength="500"
            />
          </label>
          <p style={styles.charCount}>
            {formData.bio.length}/500
          </p>
        </div>

        {/* 버튼들 */}
        <div style={styles.buttonContainer}>
          <button
            type="submit"
            disabled={saving}
            style={{
              ...styles.submitButton,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? '저장 중...' : '프로필 저장'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/')}
            style={styles.cancelButton}
          >
            취소
          </button>
        </div>
      </form>

      {/* 로그아웃 */}
      <div style={styles.logoutSection}>
        <button onClick={handleLogout} style={styles.logoutButton}>로그아웃</button>
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
    paddingTop: '80px',
    paddingBottom: '90px',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  header: {
    textAlign: 'center',
    color: 'white',
    marginBottom: '40px',
    borderBottom: '2px solid rgba(255,255,255,0.1)',
    paddingBottom: '30px',
    cursor: 'pointer',
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    marginBottom: '5px',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    margin: '0',
  },
  subtitle: {
    fontSize: '16px',
    marginBottom: '0',
    color: 'rgba(255,255,255,0.8)',
  },
  pageHeader: {
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid rgba(102,126,234,0.3)',
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    margin: '0 0 5px 0',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    margin: '0',
  },
  emailCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(102,126,234,0.3)',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '30px',
    color: 'white',
  },
  messageBox: {
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid',
    color: 'white',
    textAlign: 'center',
  },
  form: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  formSection: {
    marginBottom: '25px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#333',
    marginTop: '0',
  },
  imageUploadBox: {
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  previewContainer: {
    flex: '0 0 150px',
    height: '150px',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: '8px',
    objectFit: 'cover',
    border: '2px solid #667eea',
  },
  uploadInputContainer: {
    flex: '1',
    minWidth: '200px',
  },
  fileInput: {
    display: 'none',
  },
  uploadLabel: {
    display: 'inline-block',
    padding: '12px 20px',
    background: '#667eea',
    color: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  uploadHint: {
    fontSize: '12px',
    color: '#666',
    margin: '0',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
  },
  labelText: {
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#333',
    fontSize: '14px',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    fontFamily: 'inherit',
  },
  select: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  textarea: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    fontFamily: 'inherit',
    minHeight: '100px',
    resize: 'vertical',
  },
  charCount: {
    fontSize: '12px',
    color: '#999',
    marginTop: '5px',
    marginBottom: '0',
  },
  buttonContainer: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    marginTop: '30px',
  },
  submitButton: {
    padding: '12px 40px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: '12px 40px',
    background: '#ccc',
    color: '#333',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  logoutSection: {
    textAlign: 'center',
    marginTop: '30px',
  },
  logoutButton: {
    padding: '12px 32px',
    background: 'rgba(231, 76, 60, 0.9)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
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
