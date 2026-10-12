
'use client';

import styles from './LeaderboardBadges.module.css';

interface BadgeRank {
  id: string;
  username: string;
  image?: string;
  badges: number;
  totalPoints: number;
  rank: number;
}

interface LeaderboardBadgesProps {
  users: BadgeRank[];
}

export default function LeaderboardBadges({ users }: LeaderboardBadgesProps) {
  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '🏅';
    }
  };

  return (
    <div className={styles.container}>
      <h2>뱃지 랭킹</h2>
      <div className={styles.list}>
        {users.map((user) => (
          <div key={user.id} className={styles.item}>
            <div className={styles.rank}>
              <span className={styles.medal}>{getMedalEmoji(user.rank)}</span>
              <span className={styles.rankNumber}>#{user.rank}</span>
            </div>

            <div className={styles.user}>
              {user.image && <img src={user.image} alt={user.username} />}
              <div className={styles.info}>
                <h3>{user.username}</h3>
                <p>{user.totalPoints}포인트</p>
              </div>
            </div>

            <div className={styles.badges}>
              <span title="뱃지 개수">{user.badges}개</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
