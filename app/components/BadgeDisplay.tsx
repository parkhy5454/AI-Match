
'use client';

import styles from './BadgeDisplay.module.css';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
  isLocked: boolean;
}

interface BadgeDisplayProps {
  badges: Badge[];
  size?: 'small' | 'medium' | 'large';
}

export default function BadgeDisplay({ badges, size = 'medium' }: BadgeDisplayProps) {
  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: '#808080',
      uncommon: '#4caf50',
      rare: '#2196f3',
      epic: '#9c27b0',
      legendary: '#ff9800',
    };
    return colors[rarity] || '#808080';
  };

  return (
    <div className={`${styles.container} ${styles[size]}`}>
      {badges.map((badge) => (
        <div
          key={badge.id}
          className={`${styles.badge} ${badge.isLocked ? styles.locked : ''}`}
          title={badge.name}
        >
          <div
            className={styles.icon}
            style={{
              opacity: badge.isLocked ? 0.3 : 1,
              borderColor: getRarityColor(badge.rarity),
            }}
          >
            {badge.icon}
          </div>
          {!badge.isLocked && <span className={styles.rarity}>{badge.rarity}</span>}
          {badge.isLocked && <span className={styles.lockIcon}>🔒</span>}
          <div className={styles.tooltip}>
            <strong>{badge.name}</strong>
            <p>{badge.description}</p>
            {badge.unlockedAt && (
              <small>{new Date(badge.unlockedAt).toLocaleDateString()}</small>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
