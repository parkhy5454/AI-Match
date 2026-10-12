
'use client';

import styles from './AchievementProgress.module.css';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  progress: number;
  target: number;
  reward: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
}

interface AchievementProgressProps {
  achievement: Achievement;
}

export default function AchievementProgress({ achievement }: AchievementProgressProps) {
  const progressPercent = Math.min(
    (achievement.progress / achievement.target) * 100,
    100
  );

  return (
    <div className={`${styles.container} ${achievement.isUnlocked ? styles.unlocked : ''}`}>
      <div className={styles.header}>
        <div className={styles.iconContainer}>
          <span className={styles.icon}>{achievement.icon}</span>
        </div>
        <div className={styles.info}>
          <h3>{achievement.name}</h3>
          <p>{achievement.description}</p>
        </div>
        {achievement.isUnlocked && <span className={styles.badge}>✓</span>}
      </div>

      {!achievement.isUnlocked && (
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <span className={styles.progressText}>
            {achievement.progress} / {achievement.target}
          </span>
        </div>
      )}

      {achievement.isUnlocked && achievement.unlockedAt && (
        <div className={styles.unlockedAt}>
          획득일: {new Date(achievement.unlockedAt).toLocaleDateString()}
        </div>
      )}

      <div className={styles.reward}>
        <span>🏆</span> {achievement.reward}포인트
      </div>
    </div>
  );
}
