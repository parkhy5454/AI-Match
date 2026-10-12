
'use client';

import styles from './AdminStats.module.css';

interface AdminStatsProps {
  totalUsers: number;
  activeUsers: number;
  totalMatches: number;
  pendingReports: number;
  totalRevenue: number;
}

export default function AdminStats({
  totalUsers,
  activeUsers,
  totalMatches,
  pendingReports,
  totalRevenue,
}: AdminStatsProps) {
  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <span className={styles.label}>총 사용자</span>
        <span className={styles.value}>{totalUsers.toLocaleString()}</span>
      </div>
      <div className={styles.card}>
        <span className={styles.label}>활성 사용자</span>
        <span className={styles.value}>{activeUsers.toLocaleString()}</span>
      </div>
      <div className={styles.card}>
        <span className={styles.label}>전체 매칭</span>
        <span className={styles.value}>{totalMatches.toLocaleString()}</span>
      </div>
      <div className={`${styles.card} ${styles.alert}`}>
        <span className={styles.label}>미처리 신고</span>
        <span className={styles.value}>{pendingReports}</span>
      </div>
    </div>
  );
}
