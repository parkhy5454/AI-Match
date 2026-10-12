import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

export function useTypingIndicator(socket: Socket | null, receiverId: string) {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastTypingEmitRef = useRef<number>(0);

  useEffect(() => {
    if (!socket) return;

    socket.on('typing', (data: { senderId: string; isTyping: boolean }) => {
      if (data.senderId === receiverId) {
        setIsTyping(data.isTyping);
      }
    });

    return () => {
      socket.off('typing');
    };
  }, [socket, receiverId]);

  const emitTyping = useCallback(
    (typing: boolean) => {
      if (!socket) return;

      const now = Date.now();
      if (now - lastTypingEmitRef.current < 300) return;

      lastTypingEmitRef.current = now;

      socket.emit('typing', {
        receiverId,
        isTyping: typing,
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (typing) {
        typingTimeoutRef.current = setTimeout(() => {
          emitTyping(false);
        }, 3000);
      }
    },
    [socket, receiverId]
  );

  return { isTyping, emitTyping };
}
