
'use client';

import { useState } from 'react';
import axios from 'axios';
import styles from './ReportModal.module.css';

interface ReportModalProps {
  isOpen: boolean;
  reportedUserId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type ReportReason =
  | 'inappropriate_profile'
  | 'harassment'
  | 'spam'
  | 'fake_profile'
  | 'other';

export default function ReportModal({
  isOpen,
  reportedUserId,
  onClose,
  onSuccess,
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason>('other');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post('/api/reports', {
        reportedUserId,
        reason,
        details,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        onSuccess?.();
      }, 2000);
    } catch (error) {
      console.error('Report submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>사용자 신고</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {success ? (
          <div className={styles.successMessage}>
            <p>신고가 접수되었습니다.</p>
            <p>감사합니다.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.group}>
              <label>신고 사유</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
              >
                <option value="inappropriate_profile">부적절한 프로필</option>
                <option value="harassment">괴롭힘/위협</option>
                <option value="spam">스팸</option>
                <option value="fake_profile">가짜 프로필</option>
                <option value="other">기타</option>
              </select>
            </div>

            <div className={styles.group}>
              <label>상세 내용</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="신고 이유를 상세히 설명해주세요."
                rows={4}
              ></textarea>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
              >
                취소
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
              >
                {loading ? '처리 중...' : '신고'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
