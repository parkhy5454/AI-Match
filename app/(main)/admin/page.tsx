
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminStats from '@/app/components/AdminStats';
import ReportsList from '@/app/components/ReportsList';
import styles from './page.module.css';

export default function AdminPanel() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [statsRes, reportsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/reports'),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (reportsRes.ok) setReports(await reportsRes.json());
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>로딩 중...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>관리자 패널</h1>
        <p>시스템 모니터링 및 관리</p>
      </div>

      {stats && <AdminStats {...stats} />}
      <ReportsList reports={reports} onResolve={() => fetchAdminData()} />
    </div>
  );
}
