'use client';

import { useState } from 'react';
import Image from 'next/image';
import { User } from '@/types/user';

interface ProfileCardProps {
  user: User;
  onLike: () => void;
  onSuperLike: () => void;
  onPass: () => void;
  loading?: boolean;
  compatibility?: number;
}

export default function ProfileCard({
  user,
  onLike,
  onSuperLike,
  onPass,
  loading = false,
  compatibility = 0,
}: ProfileCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="profile-card" style={styles.card}>
      {/* 프로필 이미지 */}
      <div style={styles.imageContainer}>
        {!imageError && user.profileImage ? (
          <img
            src={user.profileImage}
            alt={user.username || user.email}
            style={styles.image}
            onError={() => setImageError(true)}
          />
        ) : (
          <div style={styles.placeholderImage}>
            <span style={styles.placeholderText}>📷</span>
          </div>
        )}
        {/* 나이 배지 */}
        <div style={styles.ageBadge}>
          {user.age}
        </div>
      </div>

      {/* 카드 내용 */}
      <div style={styles.cardContent}>
        {/* 사용자 정보 */}
        <div style={styles.header}>
          <h2 style={styles.name}>
            {user.username || user.email.split('@')[0]}
          </h2>
          <p style={styles.region}>📍 {user.region}</p>
        </div>

        {/* 상세 정보 */}
        <div style={styles.details}>
          <span style={styles.badge}>{user.gender || '정보 없음'}</span>
          <span style={styles.badge}>{user.mbti || 'XXXX'}</span>
        </div>

        {/* 소개글 */}
        {user.bio && (
          <p style={styles.bio}>
            {user.bio.substring(0, 150)}
            {user.bio.length > 150 ? '...' : ''}
          </p>
        )}

        {/* 호환도 */}
        {compatibility > 0 && (
          <div style={styles.compatibilityContainer}>
            <div style={styles.compatLabel}>호환도</div>
            <div style={styles.compatBar}>
              <div
                style={{
                  ...styles.compatFill,
                  width: `${compatibility}%`,
                }}
              />
            </div>
            <div style={styles.compatValue}>{compatibility}%</div>
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div style={styles.actions}>
        <button
          onClick={onPass}
          disabled={loading}
          style={{
            ...styles.button,
            ...styles.passButton,
            ...(loading ? styles.buttonDisabled : {}),
          }}
          title="패스"
        >
          ✕
        </button>
        <button
          onClick={onSuperLike}
          disabled={loading}
          style={{
            ...styles.button,
            ...styles.superlikeButton,
            ...(loading ? styles.buttonDisabled : {}),
          }}
          title="슈퍼좋아요"
        >
          ⭐
        </button>
        <button
          onClick={onLike}
          disabled={loading}
          style={{
            ...styles.button,
            ...styles.likeButton,
            ...(loading ? styles.buttonDisabled : {}),
          }}
          title="좋아요"
        >
          💕
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    maxWidth: '400px',
    margin: '0 auto',
  },
  imageContainer: {
    position: 'relative' as const,
    width: '100%',
    height: '450px',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e0e0',
    color: '#999',
  },
  placeholderText: {
    fontSize: '48px',
  },
  ageBadge: {
    position: 'absolute' as const,
    bottom: '16px',
    left: '16px',
    background: 'rgba(0, 0, 0, 0.6)',
    color: 'white',
    padding: '8px 14px',
    borderRadius: '20px',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  cardContent: {
    padding: '20px',
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    marginBottom: '12px',
  },
  name: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 4px 0',
  },
  region: {
    fontSize: '14px',
    color: '#666',
    margin: '0',
  },
  details: {
    display: 'flex' as const,
    gap: '8px',
    marginBottom: '12px',
    flexWrap: 'wrap' as const,
  },
  badge: {
    background: '#f0f0f0',
    color: '#333',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '600',
  },
  bio: {
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.5',
    marginBottom: '12px',
    margin: '0',
  },
  compatibilityContainer: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e0e0e0',
  },
  compatLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '6px',
  },
  compatBar: {
    height: '8px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  compatFill: {
    height: '100%',
    backgroundColor: '#667eea',
    transition: 'width 0.3s ease',
  },
  compatValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#667eea',
    textAlign: 'center' as const,
  },
  actions: {
    display: 'flex' as const,
    gap: '12px',
    padding: '16px',
    borderTop: '1px solid #e0e0e0',
    justifyContent: 'center',
  },
  button: {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '50%',
    width: '52px',
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '600',
  },
  passButton: {
    background: '#FF3B30',
    color: 'white',
  },
  superlikeButton: {
    background: '#FFD700',
    color: '#333',
  },
  likeButton: {
    background: '#667eea',
    color: 'white',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};