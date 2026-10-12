'use client';

import { useState } from 'react';
import axios from 'axios';

interface Profile {
  id: string;
  username: string;
  email: string;
  bio?: string;
  age: number;
  gender: string;
  region: string;
  mbti: string;
}

interface ProfileFormProps {
  profile: Profile;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function ProfileForm({ profile, onSuccess, onError }: ProfileFormProps) {
  const [formData, setFormData] = useState(profile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'age' ? parseInt(value) : value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.put('/api/profile', formData);
      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '프로필 업데이트 실패';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>기본 정보</h3>

        <div style={styles.formGroup}>
          <label style={styles.label}>사용자명</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            style={styles.input}
            disabled
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>이메일</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            style={styles.input}
            disabled
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>자기소개</label>
          <textarea
            name="bio"
            value={formData.bio || ''}
            onChange={handleChange}
            style={styles.textarea}
            placeholder="자신을 소개해주세요 (500자 이내)"
            maxLength={500}
          />
          <p style={styles.counter}>{(formData.bio || '').length}/500</p>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>개인 정보</h3>

        <div style={styles.twoColumn}>
          <div style={styles.formGroup}>
            <label style={styles.label}>나이</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              style={styles.input}
              min="18"
              max="120"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>성별</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">선택하세요</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
              <option value="other">기타</option>
            </select>
          </div>
        </div>

        <div style={styles.twoColumn}>
          <div style={styles.formGroup}>
            <label style={styles.label}>지역</label>
            <input
              type="text"
              name="region"
              value={formData.region}
              onChange={handleChange}
              style={styles.input}
              placeholder="예: 서울, 강남구"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>MBTI</label>
            <input
              type="text"
              name="mbti"
              value={formData.mbti}
              onChange={handleChange}
              style={styles.input}
              placeholder="예: ENFP"
              maxLength={4}
            />
          </div>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>프로필이 성공적으로 업데이트되었습니다</div>}

      <button
        type="submit"
        disabled={loading}
        style={{
          ...styles.button,
          ...(loading ? styles.buttonDisabled : {}),
        }}
      >
        {loading ? '저장 중...' : '저장하기'}
      </button>
    </form>
  );
}

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '30px',
  },
  section: {
    padding: '20px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 20px 0',
  },
  formGroup: {
    marginBottom: '16px',
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    minHeight: '100px',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  counter: {
    fontSize: '12px',
    color: '#999',
    margin: '4px 0 0 0',
  },
  button: {
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.3s',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  error: {
    padding: '12px 16px',
    background: '#FFE5E5',
    color: '#FF3B30',
    borderRadius: '6px',
    fontSize: '14px',
  },
  success: {
    padding: '12px 16px',
    background: '#E5F5E5',
    color: '#34C759',
    borderRadius: '6px',
    fontSize: '14px',
  },
};