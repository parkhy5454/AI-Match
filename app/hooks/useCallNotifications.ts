
'use client';

import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerImage?: string;
}

interface UseCallNotificationsReturn {
  incomingCall: IncomingCall | null;
  onIncomingCall: (callback: (call: IncomingCall) => void) => void;
}

let socket: Socket | null = null;

export function useCallNotifications(): UseCallNotificationsReturn {
  const [incomingCall, setIncomingCall] = useCallback(() => null, []);

  const onIncomingCall = useCallback((callback: (call: IncomingCall) => void) => {
    // Initialize socket if not already done
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
        path: '/api/calling/socket.io',
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socket.on('incoming_call', (call: IncomingCall) => {
        setIncomingCall(call);
        callback(call);
      });
    }
  }, [setIncomingCall]);

  useEffect(() => {
    return () => {
      // Cleanup socket on unmount
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, []);

  return { incomingCall: null, onIncomingCall };
}
