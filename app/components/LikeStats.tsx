'use client';

interface LikeStatsProps {
  totalLikesReceived?: number;
  totalMatches?: number;
  remainingLikes?: number;
  remainingSuperLikes?: number;
  isPremium?: boolean;
}

export default function LikeStats({
  totalLikesReceived = 0,
  totalMatches = 0,
  remainingLikes = 100,
  remainingSuperLikes = 5,
  isPremium = false,
}: LikeStatsProps) {
  const maxLikes = isPremium ? 500 : 100;
  const maxSuperLikes = isPremium ? 20 : 5;

  return (
    <div style={styles.container}>
      <div style={styles.stat}>
        <div style={styles.icon}>❤️</div>
        <div style={styles.content}>
          <span style={styles.label}>받은 좋아요</span>
          <span style={styles.value}>{totalLikesReceived}</span>
        </div>
      </div>

      <div style={styles.stat}>
        <div style={styles.icon}>💑</div>
        <div style={styles.content}>
          <span style={styles.label}>매칭</span>
          <span style={styles.value}>{totalMatches}</span>
        </div>
      </div>

      <div style={styles.stat}>
        <div style={styles.icon}>👍</div>
        <div style={styles.content}>
          <span style={styles.label}>오늘의 좋아요</span>
          <span style={styles.value}>{remainingLikes}/{maxLikes}</span>
        </div>
      </div>

      <div style={styles.stat}>
        <div style={styles.icon}>⭐</div>
        <div style={styles.content}>
          <span style={styles.label}>슈퍼좋아요</span>
          <span style={styles.value}>{remainingSuperLikes}/{maxSuperLikes}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
    padding: '16px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    padding: '12px',
  },
  icon: {
    fontSize: '28px',
    marginBottom: '8px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  label: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '4px',
    fontWeight: '500',
  },
  value: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
  },
};