'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Match {
  id: string;
  userId: string;
  username: string;
  email: string;
  profileImage?: string;
  age: number;
  region: string;
  mbti: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface MatchCardProps {
  match: Match;
  onClick: () => void;
  onUnmatch?: () => void;
}

export default function MatchCard({ match, onClick, onUnmatch }: MatchCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div style={styles.card}>
      <div style={styles.clickable} onClick={onClick}>
        {/* 프로필 이미지 */}
        <div style={styles.imageContainer}>
          {!imageError && match.profileImage ? (
            <img
              src={match.profileImage}
              alt={match.username}
              style={styles.image}
              onError={() => setImageError(true)}
            />
          ) : (
            <div style={styles.placeholderImage}>📷</div>
          )}
        </div>

        {/* 정보 */}
        <div style={styles.info}>
          <h3 style={styles.name}>
            {match.username || match.email.split('@')[0]}
          </h3>
          <p style={styles.details}>
            {match.age} | {match.region} | {match.mbti}
          </p>
          {match.lastMessage && (
            <p style={styles.lastMessage}>
              {match.lastMessage.substring(0, 40)}
              {match.lastMessage.length > 40 ? '...' : ''}
            </p>
          )}
        </div>
      </div>

      {onUnmatch && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnmatch();
          }}
          style={styles.unmatchButton}
          title="매칭 해제"
        >
          ✕
        </button>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    position: 'relative' as const,
  },
  clickable: {
    display: 'flex' as const,
    height: '120px',
  },
  imageContainer: {
    width: '120px',
    height: '120px',
    flexShrink: 0,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
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
    fontSize: '32px',
  },
  info: {
    flex: 1,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
  },
  name: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 4px 0',
  },
  details: {
    fontSize: '12px',
    color: '#999',
    margin: '0 0 4px 0',
  },
  lastMessage: {
    fontSize: '12px',
    color: '#666',
    margin: '0',
    fontStyle: 'italic',
  },
  unmatchButton: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#FF3B30',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};