
'use client';

import { useEffect, useState } from 'react';
import BadgeDisplay from '@/app/components/BadgeDisplay';
import AchievementProgress from '@/app/components/AchievementProgress';
import LeaderboardBadges from '@/app/components/LeaderboardBadges';
import { useBadges } from '@/app/hooks/useBadges';
import { useAchievements } from '@/app/hooks/useAchievements';
import { useLeaderboard } from '@/app/hooks/useLeaderboard';
import styles from './page.module.css';

export default function AchievementsPage() {
  const { badges, unlockedBadges, totalBadges } = useBadges();
  const { achievements, totalPoints } = useAchievements();
  const { leaderboard, userRank } = useLeaderboard();

  const lockedBadges = badges.filter((b) => b.isLocked);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>뱃지 & 업적</h1>
        <p>당신의 성과를 자랑하세요</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.label}>뱃지 획득</span>
          <span className={styles.value}>{unlockedBadges}</span>
          <span className={styles.total}>/{totalBadges}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.label}>총 포인트</span>
          <span className={styles.value}>{totalPoints}</span>
        </div>
        {userRank && (
          <div className={styles.statCard}>
            <span className={styles.label}>랭킹</span>
            <span className={styles.value}>#{userRank.rank}</span>
          </div>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.mainSection}>
          <section className={styles.section}>
            <h2>획득한 뱃지</h2>
            {badges.length === 0 ? (
              <p className={styles.empty}>아직 뱃지가 없습니다.</p>
            ) : (
              <BadgeDisplay badges={badges.filter((b) => !b.isLocked)} size="large" />
            )}
          </section>

          <section className={styles.section}>
            <h2>잠긴 뱃지 ({lockedBadges.length})</h2>
            {lockedBadges.length === 0 ? (
              <p className={styles.empty}>모든 뱃지를 획득했습니다!</p>
            ) : (
              <BadgeDisplay badges={lockedBadges} size="medium" />
            )}
          </section>

          <section className={styles.section}>
            <h2>업적</h2>
            {achievements.length === 0 ? (
              <p className={styles.empty}>업적 정보가 없습니다.</p>
            ) : (
              <div className={styles.achievementsList}>
                {achievements.map((achievement) => (
                  <AchievementProgress key={achievement.id} achievement={achievement} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className={styles.sidebar}>
          <LeaderboardBadges users={leaderboard} />
        </aside>
      </div>
    </div>
  );
}
