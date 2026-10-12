
'use client';

import { useState } from 'react';
import axios from 'axios';
import styles from './ReportsList.module.css';

interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUsername: string;
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: Date;
}

interface ReportsListProps {
  reports: Report[];
  onResolve?: (reportId: string) => void;
}

export default function ReportsList({ reports, onResolve }: ReportsListProps) {
  const [resolving, setResolving] = useState<string | null>(null);

  const handleResolve = async (reportId: string) => {
    try {
      setResolving(reportId);
      await axios.patch(`/api/admin/reports/${reportId}`, { status: 'resolved' });
      onResolve?.(reportId);
    } catch (error) {
      console.error('Failed to resolve report:', error);
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className={styles.container}>
      <h2>신고 관리</h2>
      <div className={styles.list}>
        {reports.length === 0 ? (
          <p className={styles.empty}>미처리 신고가 없습니다.</p>
        ) : (
          reports.map((report) => (
            <div key={report.id} className={styles.item}>
              <div className={styles.info}>
                <h3>{report.reason}</h3>
                <p className={styles.details}>
                  신고자: {report.reporterName} → 신고 대상: {report.reportedUsername}
                </p>
                <p className={styles.message}>{report.details}</p>
                <span className={styles.date}>
                  {new Date(report.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                className={styles.actionBtn}
                onClick={() => handleResolve(report.id)}
                disabled={resolving === report.id}
              >
                {resolving === report.id ? '처리 중...' : '해결'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
