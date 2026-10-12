import { useEffect, useCallback } from 'react';

export function useNotificationSocket(onNotification?: (data: any) => void) {
  useEffect(() => {
    // WebSocket 연결
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/notification/ws`);

    ws.onopen = () => {
      console.log('알림 WebSocket 연결됨');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (onNotification) {
        onNotification(data);
      }
    };

    ws.onerror = (error) => {
      console.error('알림 WebSocket 오류:', error);
    };

    ws.onclose = () => {
      console.log('알림 WebSocket 연결 종료');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [onNotification]);
}