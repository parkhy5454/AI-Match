'use client';

/**
 * MessageInputWithTyping Component
 * 타이핑 표시 기능이 포함된 메시지 입력창
 */

import React, { useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useTypingIndicator } from '@/app/hooks/use-typing-indicator';
import { TypingIndicator } from './typing-indicator';

interface MessageInputWithTypingProps {
  socket: Socket | null;
  userId: string;
  recipientId?: string; // 1:1 메시징용
  roomId?: string; // 그룹 채팅용
  onSendMessage: (content: string) => void | Promise<void>;
  placeholder?: string;
  maxLength?: number;
  typingVariant?: 'dots' | 'bubble' | 'wave' | 'pulse';
}

export const MessageInputWithTyping: React.FC<MessageInputWithTypingProps> = ({
  socket,
  userId,
  recipientId,
  roomId,
  onSendMessage,
  placeholder = '메시지를 입력하세요...',
  maxLength = 1000,
  typingVariant = 'dots',
}) => {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 타이핑 표시 훅
  const { handleInput, handleBlur, typingUsers } = useTypingIndicator({
    socket,
    userId,
    recipientId,
    roomId,
    debounceMs: 300,
    stopAfterMs: 3000,
  });

  /**
   * 텍스트 입력 처리
   */
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;

    // 최대 길이 체크
    if (text.length <= maxLength) {
      setContent(text);
      // 타이핑 표시기 알림
      handleInput();
    }
  };

  /**
   * 엔터 키로 메시지 전송
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Enter: 줄바꿈
    // Enter: 메시지 전송
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * 메시지 전송
   */
  const handleSend = async () => {
    if (!content.trim()) {
      return;
    }

    try {
      setIsSending(true);
      await onSendMessage(content.trim());
      setContent('');
      handleBlur(); // 타이핑 중지
      inputRef.current?.focus();
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    } finally {
      setIsSending(false);
    }
  };

  /**
   * 입력창 포커스 해제
   */
  const handleInputBlur = () => {
    handleBlur();
  };

  // 남은 글자 수
  const remainingChars = maxLength - content.length;
  const isNearLimit = remainingChars < 50;

  return (
    <div className="message-input-with-typing" style={{ width: '100%' }}>
      {/* 타이핑 표시기 */}
      {typingUsers.length > 0 && (
        <TypingIndicator
          typingUsers={typingUsers}
          variant={typingVariant}
          inline={false}
        />
      )}

      {/* 입력창 */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '12px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          alignItems: 'flex-end',
        }}
      >
        {/* 텍스트 입력 영역 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <textarea
            ref={inputRef}
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            disabled={isSending}
            style={{
              flex: 1,
              minHeight: '40px',
              maxHeight: '120px',
              padding: '8px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              backgroundColor: '#f9f9f9',
              fontWeight: 400,
              lineHeight: 1.4,
            }}
          />

          {/* 글자 수 표시 */}
          <div
            style={{
              fontSize: '12px',
              color: isNearLimit ? '#ff6b6b' : '#999',
              textAlign: 'right',
            }}
          >
            {content.length} / {maxLength}
            {isNearLimit && (
              <span style={{ marginLeft: '4px', color: '#ff6b6b', fontWeight: 'bold' }}>
                ⚠️
              </span>
            )}
          </div>
        </div>

        {/* 전송 버튼 */}
        <button
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          style={{
            padding: '8px 16px',
            backgroundColor: content.trim() && !isSending ? '#2563eb' : '#d1d5db',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: content.trim() && !isSending ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'background-color 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            if (content.trim() && !isSending) {
              e.currentTarget.style.backgroundColor = '#1d4ed8';
            }
          }}
          onMouseLeave={(e) => {
            if (content.trim() && !isSending) {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }
          }}
        >
          {isSending ? '전송 중...' : '전송'}
        </button>
      </div>

      {/* 도움말 텍스트 */}
      <div
        style={{
          fontSize: '11px',
          color: '#999',
          marginTop: '6px',
          paddingLeft: '12px',
        }}
      >
        💡 Shift+Enter로 줄바꿈, Enter로 전송
      </div>
    </div>
  );
};

export default MessageInputWithTyping;
