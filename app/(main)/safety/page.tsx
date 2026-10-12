
'use client';

import { useState } from 'react';
import BlockUserButton from '@/app/components/BlockUserButton';
import ReportModal from '@/app/components/ReportModal';
import { useBlocks } from '@/app/hooks/useBlocks';
import styles from './page.module.css';

export default function SafetyPage() {
  const { blockedUsers, unblockUser } = useBlocks();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>안전</h1>
        <p>개인정보 보호 및 차단 관리</p>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>차단된 사용자 ({blockedUsers.length})</h2>
          {blockedUsers.length === 0 ? (
            <p className={styles.empty}>차단된 사용자가 없습니다.</p>
          ) : (
            <div className={styles.list}>
              {blockedUsers.map((user) => (
                <div key={user.id} className={styles.item}>
                  <div className={styles.info}>
                    <h3>{user.username}</h3>
                    <p>{new Date(user.blockedAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    className={styles.unblockBtn}
                    onClick={() => unblockUser(user.id)}
                  >
                    차단 해제
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
