'use client';

import { useState } from 'react';

interface SearchResult {
  id: string;
  username: string;
  age: number;
  region: string;
  bio?: string;
  mbti: string;
  imageUrl?: string;
  compatibility?: number;
}

interface SearchResultsProps {
  results: SearchResult[];
  loading?: boolean;
  onUserClick?: (userId: string) => void;
}

export default function SearchResults({ results, loading, onUserClick }: SearchResultsProps) {
  if (loading) {
    return <div style={styles.loading}>검색 중...</div>;
  }

  if (results.length === 0) {
    return <div style={styles.empty}>검색 결과가 없습니다</div>;
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.resultCount}>검색 결과: {results.length}명</h3>
      <div style={styles.grid}>
        {results.map(result => (
          <div
            key={result.id}
            style={styles.card}
            onClick={() => onUserClick?.(result.id)}
          >
            {result.imageUrl && (
              <img
                src={result.imageUrl}
                alt={result.username}
                style={styles.image}
              />
            )}
            <div style={styles.cardContent}>
              <div style={styles.header}>
                <h4 style={styles.name}>{result.username}, {result.age}</h4>
                {result.compatibility && (
                  <span style={styles.compatibility}>{result.compatibility}%</span>
                )}
              </div>
              <p style={styles.region}>{result.region}</p>
              <p style={styles.mbti}>{result.mbti}</p>
              {result.bio && (
                <p style={styles.bio}>{result.bio.substring(0, 100)}...</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    marginTop: '20px',
  },
  resultCount: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 16px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  image: {
    width: '100%',
    height: '200px',
    objectFit: 'cover' as const,
  },
  cardContent: {
    padding: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  name: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: '0',
  },
  compatibility: {
    background: '#667eea',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
  },
  region: {
    fontSize: '13px',
    color: '#999',
    margin: '0 0 4px 0',
  },
  mbti: {
    fontSize: '13px',
    color: '#667eea',
    margin: '0 0 8px 0',
    fontWeight: '600',
  },
  bio: {
    fontSize: '13px',
    color: '#666',
    margin: '0',
    lineHeight: '1.4',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#666',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#999',
  },
};