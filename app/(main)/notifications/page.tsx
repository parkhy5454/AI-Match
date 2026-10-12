
'use client';

import { useEffect } from 'react';
import NotificationCenter from '@/app/components/NotificationCenter';
import NotificationPreferences from '@/app/components/NotificationPreferences';
import { useNotifications } from '@/app/hooks/useNotifications';
import { useNotificationSocket } from '@/app/hooks/useNotificationSocket';
import styles from './page.module.css';

export default function NotificationsPage() {
  const { notifications, loading, markAsRead, deleteNotification, markAllAsRead } = useNotifications();

  // Real-time notification updates
  useNotificationSocket((newNotification) => {
    // Notifications are automatically updated via the hook
  });

  useEffect(() => {
    // Mark all as read when viewing notifications page
    markAllAsRead();
  }, [markAllAsRead]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>알림</h1>
        <p>모든 알림을 확인하고 관리합니다.</p>
      </div>

      <div className={styles.content}>
        <div className={styles.notificationsList}>
          <h2>알림 목록</h2>
          {loading ? (
            <p className={styles.loading}>로딩 중...</p>
          ) : notifications.length === 0 ? (
            <p className={styles.empty}>알림이 없습니다.</p>
          ) : (
            <div className={styles.items}>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  {notification.image && (
                    <img src={notification.image} alt="" className={styles.image} />
                  )}
                  <div className={styles.content}>
                    <h3>{notification.title}</h3>
                    <p>{notification.message}</p>
                    <span className={styles.timestamp}>
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.preferencesPanel}>
          <NotificationPreferences />
        </div>
      </div>
    </div>
  );
}
