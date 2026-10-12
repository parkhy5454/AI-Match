import { useCallback, useEffect, useState } from 'react';

interface QueuedMessage {
  id: string;
  content: string;
  receiverId: string;
  timestamp: number;
  retries: number;
}

export function useMessageQueue() {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [processing, setProcessing] = useState(false);

  const addToQueue = useCallback((message: QueuedMessage) => {
    setQueue((prev) => [...prev, message]);
  }, []);

  const removeFromQueue = useCallback((messageId: string) => {
    setQueue((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  const processQueue = useCallback(async () => {
    if (processing || queue.length === 0) return;

    setProcessing(true);

    for (const message of queue) {
      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });

        if (response.ok) {
          removeFromQueue(message.id);
        } else if (message.retries < 3) {
          setQueue((prev) =>
            prev.map((m) =>
              m.id === message.id ? { ...m, retries: m.retries + 1 } : m
            )
          );
        } else {
          removeFromQueue(message.id);
        }
      } catch (error) {
        if (message.retries < 3) {
          setQueue((prev) =>
            prev.map((m) =>
              m.id === message.id ? { ...m, retries: m.retries + 1 } : m
            )
          );
        }
      }
    }

    setProcessing(false);
  }, [queue, processing, removeFromQueue]);

  useEffect(() => {
    const interval = setInterval(processQueue, 5000);
    return () => clearInterval(interval);
  }, [processQueue]);

  return { queue, addToQueue, removeFromQueue, processQueue };
}
