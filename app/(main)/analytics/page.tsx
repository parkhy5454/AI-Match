
'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';

interface AnalyticsData {
  totalMatches: number;
  totalMessages: number;
  totalLikes: number;
  matchesThisWeek: number;
  messagesThisWeek: number;
  likesThisWeek: number;
  profileViews: number;
  responseRate: number;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics');
        const result = await res.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <div>로딩 중...</div>;
  if (!data) return <div>데이터를 불러올 수 없습니다.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>내 통계</h1>
        <p>프로필 활동 분석</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <span className={styles.label}>총 매칭</span>
          <span className={styles.value}>{data.totalMatches}</span>
          <span className={styles.subtext}>이번 주: {data.matchesThisWeek}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>총 메시지</span>
          <span className={styles.value}>{data.totalMessages}</span>
          <span className={styles.subtext}>이번 주: {data.messagesThisWeek}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>총 좋아요</span>
          <span className={styles.value}>{data.totalLikes}</span>
          <span className={styles.subtext}>이번 주: {data.likesThisWeek}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>프로필 조회</span>
          <span className={styles.value}>{data.profileViews}</span>
          <span className={styles.subtext}>응답률: {data.responseRate}%</span>
        </div>
      </div>
    </div>
  );
}
