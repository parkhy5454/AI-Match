'use client';

import { useEffect } from 'react';
import PasswordChanger from '@/app/components/PasswordChanger';
import { useSettings } from '@/app/hooks/useSettings';

export default function AccountSettingsPage() {
  const { settings, loading, fetchSettings, updateSettings } = useSettings();

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggleSetting = async (key: string) => {
    if (!settings) return;
    await updateSettings({
      [key]: !settings[key as keyof typeof settings],
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>계정 설정</h1>
      </div>

      <div style={styles.grid}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>알림 설정</h2>
          {settings && (
            <div style={styles.settingsList}>
              <div style={styles.settingItem}>
                <div>
                  <div style={styles.settingLabel}>전체 알림</div>
                  <div style={styles.settingDescription}>모든 알림을 활성화/비활성화합니다</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={() => handleToggleSetting('notificationsEnabled')}
                  style={styles.toggle}
                  disabled={loading}
                />
              </div>

              <div style={styles.settingItem}>
                <div>
                  <div style={styles.settingLabel}>이메일 알림</div>
                  <div style={styles.settingDescription}>중요한 소식을 이메일로 받습니다</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={() => handleToggleSetting('emailNotifications')}
                  style={styles.toggle}
                  disabled={loading}
                />
              </div>

              <div style={styles.settingItem}>
                <div>
                  <div style={styles.settingLabel}>푸시 알림</div>
                  <div style={styles.settingDescription}>앱 알림을 활성화합니다</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={() => handleToggleSetting('pushNotifications')}
                  style={styles.toggle}
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>프라이버시 설정</h2>
          {settings && (
            <div style={styles.settingsList}>
              <div style={styles.settingItem}>
                <div>
                  <div style={styles.settingLabel}>비공개 프로필</div>
                  <div style={styles.settingDescription}>프로필을 비공개로 설정합니다</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.privateProfile}
                  onChange={() => handleToggleSetting('privateProfile')}
                  style={styles.toggle}
                  disabled={loading}
                />
              </div>

              <div style={styles.settingItem}>
                <div>
                  <div style={styles.settingLabel}>온라인 상태 표시</div>
                  <div style={styles.settingDescription}>온라인 상태를 다른 사용자에게 표시합니다</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showOnlineStatus}
                  onChange={() => handleToggleSetting('showOnlineStatus')}
                  style={styles.toggle}
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </div>

        <div style={{...styles.section, gridColumn: '1 / -1'}}>
          <PasswordChanger />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    marginBottom: '30px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    marginTop: '0',
    marginBottom: '20px',
  },
  settingsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  settingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '12px 0',
    borderBottom: '1px solid #eee',
  },
  settingLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '4px',
  },
  settingDescription: {
    fontSize: '12px',
    color: '#999',
  },
  toggle: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  },
};