'use client';

interface VerificationBadgeProps {
  type: 'email' | 'phone' | 'photo';
  verified: boolean;
  onClick?: () => void;
}

export default function VerificationBadge({ type, verified, onClick }: VerificationBadgeProps) {
  const getLabel = () => {
    switch (type) {
      case 'email':
        return '이메일';
      case 'phone':
        return '전화번호';
      case 'photo':
        return '사진';
      default:
        return '';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'email':
        return '✉️';
      case 'phone':
        return '📱';
      case 'photo':
        return '📸';
      default:
        return '';
    }
  };

  return (
    <div
      style={{
        ...styles.badge,
        ...(verified ? styles.verified : styles.unverified),
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <span style={styles.icon}>{getIcon()}</span>
      <span style={styles.label}>{getLabel()}</span>
      <span style={styles.status}>
        {verified ? '✓ 인증됨' : '인증 필요'}
      </span>
    </div>
  );
}

const styles = {
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  verified: {
    background: '#E5F5E5',
    color: '#34C759',
    border: '1px solid #34C759',
  },
  unverified: {
    background: '#FFF3E0',
    color: '#FF9500',
    border: '1px solid #FF9500',
  },
  icon: {
    fontSize: '20px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    flex: 1,
  },
  status: {
    fontSize: '12px',
    fontWeight: '500',
  },
};