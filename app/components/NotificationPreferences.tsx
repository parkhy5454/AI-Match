'use client';

import { useState } from 'react';
import axios from 'axios';

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  likeNotifications: boolean;
  matchNotifications: boolean;
  messageNotifications: boolean;
  systemNotifications: boolean;
  notificationFrequency: 'instant' | 'daily' | 'weekly';
}

interface NotificationPreferencesProps {
  onSuccess?: () => void;
}

export default function NotificationPreferences({ onSuccess }: NotificationPreferencesProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    likeNotifications: true,
    matchNotifications: true,
    messageNotifications: true,
    systemNotifications: true,
    notificationFrequency: 'instant',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleFrequencyChange = (frequency: 'instant' | 'daily' | 'weekly') => {
    setSettings(prev => ({
      ...prev,
      notificationFrequency: frequency,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.put('/api/notification/preferences', settings);
      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('설정 저장 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>알림 채널</h3>
        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>이메일 알림</div>
            <div style={styles.settingDescription}>메일로 알림을 받습니다</div>
          </div>
          <input
            type="checkbox"
            checked={settings.emailNotifications}
            onChange={() => handleToggle('emailNotifications')}
            style={styles.checkbox}
          />
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>푸시 알림</div>
            <div style={styles.settingDescription}>앱에서 푸시 알림을 받습니다</div>
          </div>
          <input
            type="checkbox"
            checked={settings.pushNotifications}
            onChange={() => handleToggle('pushNotifications')}
            style={styles.checkbox}
          />
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>알림 유형</h3>
        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>좋아요 알림</div>
            <div style={styles.settingDescription}>누군가 나에게 좋아요를 했을 때</div>
          </div>
          <input
            type="checkbox"
            checked={settings.likeNotifications}
            onChange={() => handleToggle('likeNotifications')}
            style={styles.checkbox}
          />
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>매칭 알림</div>
            <div style={styles.settingDescription}>새로운 매칭이 발생했을 때</div>
          </div>
          <input
            type="checkbox"
            checked={settings.matchNotifications}
            onChange={() => handleToggle('matchNotifications')}
            style={styles.checkbox}
          />
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>메시지 알림</div>
            <div style={styles.settingDescription}>새 메시지를 받았을 때</div>
          </div>
          <input
            type="checkbox"
            checked={settings.messageNotifications}
            onChange={() => handleToggle('messageNotifications')}
            style={styles.checkbox}
          />
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.settingLabel}>시스템 알림</div>
            <div style={styles.settingDescription}>중요한 공지사항과 업데이트</div>
          </div>
          <input
            type="checkbox"
            checked={settings.systemNotifications}
            onChange={() => handleToggle('systemNotifications')}
            style={styles.checkbox}
          />
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>알림 빈도</h3>
        <div style={styles.frequencyButtons}>
          <button
            onClick={() => handleFrequencyChange('instant')}
            style={{
              ...styles.frequencyButton,
              ...(settings.notificationFrequency === 'instant' ? styles.frequencyButtonActive : {}),
            }}
          >
            즉시
          </button>
          <button
            onClick={() => handleFrequencyChange('daily')}
            style={{
              ...styles.frequencyButton,
              ...(settings.notificationFrequency === 'daily' ? styles.frequencyButtonActive : {}),
            }}
          >
            일일 요약
          </button>
          <button
            onClick={() => handleFrequencyChange('weekly')}
            style={{
              ...styles.frequencyButton,
              ...(settings.notificationFrequency === 'weekly' ? styles.frequencyButtonActive : {}),
            }}
          >
            주간 요약
          </button>
        </div>
      </div>

      {success && (
        <div style={styles.success}>알림 설정이 저장되었습니다</div>
      )}

      <button
        onClick={handleSave}
        disabled={loading}
        style={{
          ...styles.saveButton,
          ...(loading ? styles.saveButtonDisabled : {}),
        }}
      >
        {loading ? '저장 중...' : '저장하기'}
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 16px 0',
  },
  settingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #eee',
  },
  settingLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  settingDescription: {
    fontSize: '12px',
    color: '#999',
    marginTop: '4px',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  },
  frequencyButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '12px',
  },
  frequencyButton: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.2s',
  },
  frequencyButtonActive: {
    background: '#667eea',
    color: 'white',
    border: '1px solid #667eea',
  },
  success: {
    padding: '12px 16px',
    background: '#E5F5E5',
    color: '#34C759',
    borderRadius: '6px',
    fontSize: '14px',
  },
  saveButton: {
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  saveButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};