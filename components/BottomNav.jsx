'use client';

import { useRouter, usePathname } from 'next/navigation';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: '🏠 홈', path: '/', icon: '🏠' },
    { label: '🔍 검색', path: '/search', icon: '🔍' },
    { label: '💕 매칭', path: '/matches', icon: '💕' },
    { label: '💬 메시지', path: '/messages', icon: '💬' },
    { label: '👤 프로필', path: '/profile', icon: '👤' },
    { label: '⚙️ 설정', path: '/settings', icon: '⚙️' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <nav style={styles.bottomNav}>
      <div style={styles.navContainer}>
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            style={{
              ...styles.navButton,
              ...(isActive(item.path) ? styles.navButtonActive : styles.navButtonInactive),
            }}
            title={item.label}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span style={styles.navLabel}>{item.label.split(' ')[1]}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

const styles = {
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'white',
    borderTop: '1px solid #eee',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
    zIndex: 100,
  },
  navContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    maxWidth: '100%',
    height: '70px',
    margin: '0 auto',
  },
  navButton: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    padding: '10px',
    transition: 'all 0.2s ease',
    fontSize: '12px',
    fontWeight: '500',
  },
  navButtonActive: {
    color: '#667eea',
    borderTop: '3px solid #667eea',
  },
  navButtonInactive: {
    color: '#999',
  },
  navIcon: {
    fontSize: '24px',
    display: 'block',
  },
  navLabel: {
    fontSize: '11px',
  },
};
