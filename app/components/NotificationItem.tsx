'use client';

interface NotificationItemProps {
  id: string;
  type: 'like' | 'match' | 'message' | 'system';
  title: string;
  message: string;
  image?: string;
  read: boolean;
  createdAt: string;
  onRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function NotificationItem({
  id,
  type,
  title,
  message,
  image,
  read,
  createdAt,
  onRead,
  onDelete,
}: NotificationItemProps) {
  const getIcon = () => {
    switch (type) {
      case 'like':
        return '❤️';
      case 'match':
        return '💕';
      case 'message':
        return '💬';
      case 'system':
        return '📢';
      default:
        return '🔔';
    }
  };

  const handleClick = () => {
    if (!read && onRead) {
      onRead(id);
    }
  };

  return (
    <div
      style={{
        ...styles.container,
        ...(read ? {} : styles.unread),
      }}
      onClick={handleClick}
    >
      <div style={styles.iconWrapper}>{getIcon()}</div>

      {image && <img src={image} alt={title} style={styles.image} />}

      <div style={styles.content}>
        <div style={styles.title}>{title}</div>
        <div style={styles.message}>{message}</div>
        <div style={styles.time}>
          {new Date(createdAt).toLocaleString('ko-KR')}
        </div>
      </div>

      {!read && <div style={styles.badge} />}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete?.(id);
        }}
        style={styles.deleteButton}
      >
        ✕
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    borderBottom: '1px solid #f0f0f0',
    background: 'white',
    cursor: 'pointer',
    transition: 'background 0.2s',
    alignItems: 'flex-start',
  },
  unread: {
    background: '#F5F5F5',
  },
  iconWrapper: {
    fontSize: '24px',
    flexShrink: 0,
  },
  image: {
    width: '50px',
    height: '50px',
    borderRadius: '8px',
    objectFit: 'cover' as const,
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '4px',
  },
  message: {
    fontSize: '13px',
    color: '#666',
    lineHeight: '1.4',
    marginBottom: '6px',
  },
  time: {
    fontSize: '12px',
    color: '#999',
  },
  badge: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#667eea',
    flexShrink: 0,
    marginTop: '4px',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    color: '#ccc',
    cursor: 'pointer',
    fontSize: '16px',
    flexShrink: 0,
  },
};