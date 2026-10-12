'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/app/hooks/useNotifications';

interface Notification {
  id: string;
  type: 'like' | 'match' | 'message' | 'system';
  title: string;
  message: string;
  image?: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export default function NotificationCenter() {
  const { notifications, loading, markAsRead, deleteNotification, fetchNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <div style={styles.container}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.bell}
        aria-label="알림"
      >
        🔔
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <h3 style={styles.title}>알림</h3>
            <button
              onClick={() => setIsOpen(false)}
              style={styles.closeButton}
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div style={styles.empty}>로드 중...</div>
          ) : notifications.length === 0 ? (
            <div style={styles.empty}>알림이 없습니다</div>
          ) : (
            <div style={styles.notificationList}>
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  style={{
                    ...styles.notificationItem,
                    ...(notification.read ? {} : styles.notificationItemUnread),
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {notification.image && (
                    <img
                      src={notification.image}
                      alt={notification.title}
                      style={styles.image}
                    />
                  )}
                  <div style={styles.content}>
                    <div style={styles.notificationTitle}>
                      {notification.title}
                    </div>
                    <div style={styles.notificationMessage}>
                      {notification.message}
                    </div>
                    <div style={styles.time}>
                      {new Date(notification.createdAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    style={styles.deleteButton}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={styles.footer}>
            <a href="/notifications" style={styles.viewAllLink}>
              모든 알림 보기
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'relative' as const,
  },
  bell: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    position: 'relative' as const,
  },
  badge: {
    position: 'absolute' as const,
    top: '-8px',
    right: '-8px',
    background: '#FF3B30',
    color: 'white',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  dropdown: {
    position: 'absolute' as const,
    top: '40px',
    right: '0',
    width: '400px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #eee',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: '0',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#999',
  },
  notificationList: {
    maxHeight: '400px',
    overflowY: 'auto' as const,
  },
  notificationItem: {
    display: 'flex',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  notificationItemUnread: {
    background: '#F5F5F5',
  },
  image: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    objectFit: 'cover' as const,
  },
  content: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '4px',
  },
  notificationMessage: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '4px',
    lineHeight: '1.4',
  },
  time: {
    fontSize: '12px',
    color: '#999',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    color: '#ccc',
    cursor: 'pointer',
    fontSize: '16px',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '40px 16px',
    color: '#999',
    fontSize: '14px',
  },
  footer: {
    padding: '12px 16px',
    textAlign: 'center' as const,
    borderTop: '1px solid #eee',
  },
  viewAllLink: {
    color: '#667eea',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
  },
};