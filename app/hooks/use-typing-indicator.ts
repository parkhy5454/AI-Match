/**
 * useTypingIndicator Hook
 * 타이핑 상태를 관리하고 상대방에게 알림
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface TypingUser {
  userId: string;
  username: string;
  startTime: number;
}

interface UseTypingIndicatorOptions {
  socket: Socket | null;
  userId: string;
  recipientId?: string; // 1:1 메시징용
  roomId?: string; // 그룹 채팅용
  debounceMs?: number; // 입력 감지 디바운싱 (기본값: 300ms)
  stopAfterMs?: number; // 입력 중지 타임아웃 (기본값: 3000ms)
}

export function useTypingIndicator({
  socket,
  userId,
  recipientId,
  roomId,
  debounceMs = 300,
  stopAfterMs = 3000,
}: UseTypingIndicatorOptions) {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());

  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const stopTimeoutRef = useRef<NodeJS.Timeout>();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * 타이핑 시작 알림 전송
   */
  const startTyping = useCallback(() => {
    if (!socket || !isTyping) return;

    if (recipientId) {
      socket.emit('typing:start', { recipientId });
    } else if (roomId) {
      socket.emit('typing:start', { roomId });
    }
  }, [socket, isTyping, recipientId, roomId]);

  /**
   * 타이핑 중지 알림 전송
   */
  const stopTyping = useCallback(() => {
    if (!socket) return;

    setIsTyping(false);

    if (recipientId) {
      socket.emit('typing:stop', { recipientId });
    } else if (roomId) {
      socket.emit('typing:stop', { roomId });
    }
  }, [socket, recipientId, roomId]);

  /**
   * 사용자가 입력 중임을 표시
   */
  const handleInput = useCallback(() => {
    // 이미 타이핑 중이면 타이머만 리셋
    if (isTyping) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = setTimeout(stopTyping, stopAfterMs);
      return;
    }

    // 새로운 타이핑 시작
    clearTimeout(debounceTimeoutRef.current);

    debounceTimeoutRef.current = setTimeout(() => {
      setIsTyping(true);

      // 타이핑 시작 이벤트 전송
      if (recipientId) {
        socket?.emit('typing:start', { recipientId });
      } else if (roomId) {
        socket?.emit('typing:start', { roomId });
      }

      // 타이핑 중지 타이머 설정
      stopTimeoutRef.current = setTimeout(stopTyping, stopAfterMs);
    }, debounceMs);
  }, [isTyping, socket, recipientId, roomId, debounceMs, stopAfterMs, stopTyping]);

  /**
   * 입력창 포커스 해제 시 타이핑 중지
   */
  const handleBlur = useCallback(() => {
    clearTimeout(debounceTimeoutRef.current);
    clearTimeout(stopTimeoutRef.current);
    stopTyping();
  }, [stopTyping]);

  /**
   * 원격 사용자의 타이핑 표시 리스너 설정
   */
  useEffect(() => {
    if (!socket) return;

    // 타이핑 시작 이벤트
    const handleTypingStart = (data: { userId: string; username?: string; recipientId?: string; roomId?: string }) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.userId, {
          userId: data.userId,
          username: data.username || data.userId,
          startTime: Date.now(),
        });
        return newMap;
      });
    };

    // 타이핑 중지 이벤트
    const handleTypingStop = (data: { userId: string }) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
    };

    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket]);

  /**
   * 타이핑 상태 타임아웃 (5초 이상 메시지 없으면 자동 중지)
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeout = 5000; // 5초

      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        let changed = false;

        newMap.forEach((user, userId) => {
          if (now - user.startTime > timeout) {
            newMap.delete(userId);
            changed = true;
          }
        });

        return changed ? newMap : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * 컴포넌트 언마운트 시 정리
   */
  useEffect(() => {
    return () => {
      clearTimeout(debounceTimeoutRef.current);
      clearTimeout(stopTimeoutRef.current);
      clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return {
    isTyping,
    typingUsers: Array.from(typingUsers.values()),
    handleInput,
    handleBlur,
    startTyping,
    stopTyping,
  };
}

export type { TypingUser, UseTypingIndicatorOptions };
