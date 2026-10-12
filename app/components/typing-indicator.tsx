'use client';

/**
 * TypingIndicator Component
 * 타이핑 상태를 시각적으로 표시
 */

import React from 'react';

interface TypingIndicatorProps {
  /** 타이핑 중인 사용자 목록 */
  typingUsers: Array<{
    userId: string;
    username: string;
    startTime: number;
  }>;

  /** 스타일 변형 */
  variant?: 'dots' | 'bubble' | 'wave' | 'pulse';

  /** 메시지 옆에 표시할지 여부 */
  inline?: boolean;

  /** 커스텀 클래스 */
  className?: string;
}

/**
 * 점 애니메이션 스타일 (기본값)
 */
const DotsAnimation: React.FC = () => (
  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
    <span
      style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: '#999',
        animation: 'typing-dot 1.4s infinite',
        animationDelay: '0s',
      }}
    />
    <span
      style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: '#999',
        animation: 'typing-dot 1.4s infinite',
        animationDelay: '0.2s',
      }}
    />
    <span
      style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: '#999',
        animation: 'typing-dot 1.4s infinite',
        animationDelay: '0.4s',
      }}
    />
    <style>{`
      @keyframes typing-dot {
        0%, 60%, 100% {
          opacity: 0.5;
          transform: translateY(0);
        }
        30% {
          opacity: 1;
          transform: translateY(-10px);
        }
      }
    `}</style>
  </div>
);

/**
 * 버블 애니메이션
 */
const BubbleAnimation: React.FC = () => (
  <div style={{ display: 'flex', gap: '2px' }}>
    <div
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#999',
        animation: 'bubble-bounce 1.4s infinite',
        animationDelay: '0s',
      }}
    />
    <div
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#999',
        animation: 'bubble-bounce 1.4s infinite',
        animationDelay: '0.2s',
      }}
    />
    <div
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#999',
        animation: 'bubble-bounce 1.4s infinite',
        animationDelay: '0.4s',
      }}
    />
    <style>{`
      @keyframes bubble-bounce {
        0%, 80%, 100% {
          opacity: 0.4;
          transform: scale(0.8);
        }
        40% {
          opacity: 1;
          transform: scale(1);
        }
      }
    `}</style>
  </div>
);

/**
 * 파동 애니메이션
 */
const WaveAnimation: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '20px' }}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        style={{
          width: '4px',
          height: '4px',
          backgroundColor: '#999',
          borderRadius: '2px',
          animation: 'wave 1s infinite',
          animationDelay: `${i * 0.15}s`,
        }}
      />
    ))}
    <style>{`
      @keyframes wave {
        0%, 100% {
          height: 4px;
          opacity: 0.5;
        }
        50% {
          height: 12px;
          opacity: 1;
        }
      }
    `}</style>
  </div>
);

/**
 * 펄스 애니메이션
 */
const PulseAnimation: React.FC = () => (
  <div
    style={{
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: '#999',
      animation: 'pulse 1.5s infinite',
    }}
  >
    <style>{`
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.5;
          transform: scale(0.8);
        }
      }
    `}</style>
  </div>
);

/**
 * 애니메이션 선택
 */
const AnimationComponent: React.FC<{ variant: 'dots' | 'bubble' | 'wave' | 'pulse' }> = ({
  variant,
}) => {
  switch (variant) {
    case 'bubble':
      return <BubbleAnimation />;
    case 'wave':
      return <WaveAnimation />;
    case 'pulse':
      return <PulseAnimation />;
    case 'dots':
    default:
      return <DotsAnimation />;
  }
};

/**
 * TypingIndicator 컴포넌트
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  variant = 'dots',
  inline = false,
  className = '',
}) => {
  if (typingUsers.length === 0) {
    return null;
  }

  const userNames = typingUsers.map((u) => u.username).join(', ');
  const isMultiple = typingUsers.length > 1;

  if (inline) {
    // 인라인 표시 (메시지 옆)
    return (
      <div
        className={`typing-indicator inline ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#999',
        }}
      >
        <span>{userNames}이(가) 입력 중...</span>
        <AnimationComponent variant={variant} />
      </div>
    );
  }

  // 블록 표시 (별도 라인)
  return (
    <div
      className={`typing-indicator block ${className}`}
      style={{
        padding: '12px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '13px',
        color: '#666',
      }}
    >
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 500 }}>
          {userNames}
          {isMultiple ? '이' : '가'} 입력 중입니다
        </span>
      </div>
      <AnimationComponent variant={variant} />
    </div>
  );
};

export default TypingIndicator;
