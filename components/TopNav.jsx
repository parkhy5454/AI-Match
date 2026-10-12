'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import { clearTokens, loadTokensFromStorage } from '@/lib/apiClient';

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationList, setNotificationList] = useState([]);

  useEffect(() => {
    loadTokensFromStorage();
    const token = localStorage.getItem('accessToken');
    setIsLoggedIn(!!token);

    // 로그인했으면 알림 데이터 가져오기
    if (token) {
      fetchNotifications(token);

      // 10초마다 알림 갱신
      const interval = setInterval(() => fetchNotifications(token), 10000);
      return () => clearInterval(interval);
    }

    setLoading(false);
  }, [pathname]);

  const fetchNotifications = async (token) => {
    try {
      const response = await axios.get('/api/notifications?page=1&limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.data) {
        const notifications = response.data.data;
        const unread = notifications.filter(n => !n.isRead).length;
        setUnreadCount(unread);
        setNotificationList(notifications);
        console.log('[TopNav] 알림 갱신됨:', unread, '개 미읽음');
      }
    } catch (error) {
      console.error('[TopNav] 알림 데이터 로드 실패:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await axios.post('/api/auth/logout', {}, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('로그아웃 실패:', error);
    } finally {
      // 토큰 제거 및 상태 초기화
      clearTokens();
      setIsLoggedIn(false);
      router.push('/login');
    }
  };

  // 로그인/회원가입 페이지에서는 TopNav 숨기기
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  const handleNotificationClick = () => {
    setShowNotificationMenu(!showNotificationMenu);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return '❤️';
      case 'match':
        return '💕';
      case 'message':
        return '💬';
      case 'system':
        return 'ℹ️';
      default:
        return '🔔';
    }
  };

  const handleViewAllNotifications = () => {
    router.push('/notifications');
    setShowNotificationMenu(false);
  };

  return (
    <nav style={styles.topNav}>
      <div style={styles.navContainer}>
        {/* 로고 */}
        <button
          onClick={() => router.push('/')}
          style={styles.logo}
          title="홈으로"
        >
          AI-Match
        </button>

        {/* 오른쪽 버튼들 */}
        <div style={styles.rightButtons}>
          {/* 알림 드롭다운 */}
          {isLoggedIn && (
            <div style={styles.notificationDropdown}>
              <button
                onClick={handleNotificationClick}
                style={styles.notificationButton}
                title="알림"
              >
                🔔
                {unreadCount > 0 && (
                  <span style={styles.badge}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* 드롭다운 메뉴 */}
              {showNotificationMenu && (
                <div style={styles.notificationMenu}>
                  <div style={styles.menuTitle}>
                    최근 알림 {unreadCount > 0 && `(${unreadCount}개 미읽음)`}
                  </div>

                  {notificationList.length > 0 ? (
                    <>
                      {notificationList.map(notification => (
                        <button
                          key={notification.id}
                          onClick={() => {
                            setShowNotificationMenu(false);
                          }}
                          style={{
                            ...styles.menuItem,
                            ...(!notification.isRead ? styles.menuItemUnread : {}),
                          }}
                          title={notification.body}
                        >
                          <span style={styles.menuIcon}>
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div style={styles.menuTextContainer}>
                            <span style={styles.menuText}>
                              {notification.title}
                            </span>
                            <span style={styles.menuBody}>
                              {notification.body.substring(0, 40)}
                              {notification.body.length > 40 ? '...' : ''}
                            </span>
                          </div>
                          {!notification.isRead && (
                            <span style={styles.menuBadge}>●</span>
                          )}
                        </button>
                      ))}
                      <button
                        onClick={handleViewAllNotifications}
                        style={styles.viewAllButton}
                      >
                        모든 알림 보기
                      </button>
                    </>
                  ) : (
                    <div style={styles.noNotifications}>
                      새로운 알림이 없습니다
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isLoggedIn && (
            <button
              onClick={() => router.push('/referral')}
              style={styles.navButton}
              title="친구 추천"
            >
              🎁 추천
            </button>
          )}

          <button
            onClick={isLoggedIn ? handleLogout : () => router.push('/login')}
            style={{
              ...styles.navButton,
              ...styles.authButton,
            }}
            title={isLoggedIn ? '로그아웃' : '로그인'}
          >
            {isLoggedIn ? '🚪 로그아웃' : '🔐 로그인'}
          </button>
        </div>
      </div>

      {/* 드롭다운 메뉴 외부 클릭 시 닫기 */}
      {showNotificationMenu && (
        <div
          style={styles.backdrop}
          onClick={() => setShowNotificationMenu(false)}
        />
      )}
    </nav>
  );
}

const styles = {
  topNav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    zIndex: 200,
    paddingTop: 'max(12px, env(safe-area-inset-top))',
    paddingBottom: '12px',
  },
  navContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },
  logo: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'white',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 16px',
    transition: 'all 0.2s ease',
  },
  rightButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  notificationDropdown: {
    position: 'relative',
  },
  notificationButton: {
    position: 'relative',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '8px 16px',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    background: '#FF3B30',
    color: 'white',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 'bold',
    border: '2px solid rgba(102, 126, 234, 1)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  notificationMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    minWidth: '280px',
    zIndex: 1000,
    overflow: 'hidden',
  },
  menuTitle: {
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '700',
    color: '#333',
    borderBottom: '1px solid #eee',
    backgroundColor: '#f8f9fa',
  },
  menuItem: {
    width: '100%',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    border: 'none',
    background: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderBottom: '1px solid #f0f0f0',
    textAlign: 'left',
  },
  menuIcon: {
    fontSize: '18px',
    minWidth: '24px',
  },
  menuTextContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    textAlign: 'left',
  },
  menuText: {
    fontSize: '14px',
    color: '#333',
    fontWeight: '600',
  },
  menuBody: {
    fontSize: '12px',
    color: '#999',
  },
  menuItemUnread: {
    background: 'rgba(102, 126, 234, 0.05)',
    borderLeft: '3px solid #667eea',
    paddingLeft: '13px',
  },
  menuBadge: {
    color: '#FF3B30',
    fontSize: '16px',
    minWidth: '8px',
    textAlign: 'center',
  },
  viewAllButton: {
    width: '100%',
    padding: '12px 16px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderTop: '1px solid #eee',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  noNotifications: {
    padding: '24px 16px',
    textAlign: 'center',
    color: '#999',
    fontSize: '13px',
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  navButton: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  authButton: {
    background: 'rgba(255,255,255,0.25)',
  },
};
