'use client';

import { useState } from 'react';
import { useAdvancedSearch } from '@/app/hooks/useAdvancedSearch';

interface SearchFilters {
  ageMin: number;
  ageMax: number;
  region: string;
  mbti: string;
  interests: string[];
  gender: string;
  distance?: number;
}

interface SearchFormProps {
  onSearch?: (filters: SearchFilters) => void;
}

const MBTI_OPTIONS = ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'];
const INTERESTS = ['영화', '음악', '운동', '여행', '독서', '게임', '요리', '미술', '사진', '동물', '패션', '뷰티'];

export default function SearchForm({ onSearch }: SearchFormProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    ageMin: 18,
    ageMax: 60,
    region: '',
    mbti: '',
    interests: [],
    gender: '',
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleAgeMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      ageMin: parseInt(e.target.value),
    }));
  };

  const handleAgeMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      ageMax: parseInt(e.target.value),
    }));
  };

  const handleRegionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      region: e.target.value,
    }));
  };

  const handleMBTIChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({
      ...prev,
      mbti: e.target.value,
    }));
  };

  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({
      ...prev,
      gender: e.target.value,
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setFilters(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSearch = () => {
    if (onSearch) {
      onSearch(filters);
    }
  };

  const handleReset = () => {
    setFilters({
      ageMin: 18,
      ageMax: 60,
      region: '',
      mbti: '',
      interests: [],
      gender: '',
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>사람 찾기</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={styles.toggleButton}
        >
          {isExpanded ? '▼' : '▶'} 필터
        </button>
      </div>

      {isExpanded && (
        <div style={styles.formContainer}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>나이</h3>
            <div style={styles.ageRange}>
              <input
                type="range"
                min="18"
                max="100"
                value={filters.ageMin}
                onChange={handleAgeMinChange}
                style={styles.slider}
              />
              <span style={styles.ageText}>{filters.ageMin}</span>
              <span style={styles.separator}>~</span>
              <input
                type="range"
                min="18"
                max="100"
                value={filters.ageMax}
                onChange={handleAgeMaxChange}
                style={styles.slider}
              />
              <span style={styles.ageText}>{filters.ageMax}</span>
            </div>
          </div>

          <div style={styles.twoColumn}>
            <div style={styles.section}>
              <label style={styles.label}>지역</label>
              <input
                type="text"
                value={filters.region}
                onChange={handleRegionChange}
                style={styles.input}
                placeholder="예: 서울, 강남구"
              />
            </div>

            <div style={styles.section}>
              <label style={styles.label}>성별</label>
              <select
                value={filters.gender}
                onChange={handleGenderChange}
                style={styles.input}
              >
                <option value="">모두</option>
                <option value="male">남성</option>
                <option value="female">여성</option>
                <option value="other">기타</option>
              </select>
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>MBTI</label>
            <select
              value={filters.mbti}
              onChange={handleMBTIChange}
              style={styles.input}
            >
              <option value="">모두</option>
              {MBTI_OPTIONS.map(mbti => (
                <option key={mbti} value={mbti}>{mbti}</option>
              ))}
            </select>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>관심사</label>
            <div style={styles.interestGrid}>
              {INTERESTS.map(interest => (
                <button
                  key={interest}
                  onClick={() => handleInterestToggle(interest)}
                  style={{
                    ...styles.interestButton,
                    ...(filters.interests.includes(interest) ? styles.interestButtonActive : {}),
                  }}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.buttonGroup}>
            <button onClick={handleSearch} style={styles.searchButton}>
              검색하기
            </button>
            <button onClick={handleReset} style={styles.resetButton}>
              초기화
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    marginBottom: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #eee',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: '0',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    fontSize: '14px',
    color: '#667eea',
    cursor: 'pointer',
    fontWeight: '600',
  },
  formContainer: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    margin: '0',
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
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
  ageRange: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  slider: {
    flex: 1,
    height: '6px',
    borderRadius: '3px',
  },
  ageText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    minWidth: '30px',
    textAlign: 'center' as const,
  },
  separator: {
    color: '#999',
  },
  interestGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
    gap: '8px',
  },
  interestButton: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '20px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.2s',
  },
  interestButtonActive: {
    background: '#667eea',
    color: 'white',
    border: '1px solid #667eea',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
  },
  searchButton: {
    flex: 1,
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  resetButton: {
    flex: 1,
    padding: '12px 24px',
    background: '#f0f0f0',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};