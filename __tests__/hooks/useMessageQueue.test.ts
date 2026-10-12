import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessageQueue } from '@/app/hooks/useMessageQueue';

describe('useMessageQueue', () => {
  it('should initialize with empty queue', () => {
    const { result } = renderHook(() => useMessageQueue());
    expect(result.current.queue).toEqual([]);
  });

  it('should add message to queue', async () => {
    const { result } = renderHook(() => useMessageQueue());
    const message = {
      id: '1',
      content: 'test',
      receiverId: 'user-123',
      timestamp: Date.now(),
      retries: 0,
    };

    await act(async () => {
      result.current.addToQueue(message);
    });

    expect(result.current.queue).toContain(message);
  });

  it('should remove message from queue', async () => {
    const { result } = renderHook(() => useMessageQueue());
    const message = {
      id: '1',
      content: 'test',
      receiverId: 'user-123',
      timestamp: Date.now(),
      retries: 0,
    };

    await act(async () => {
      result.current.addToQueue(message);
      result.current.removeFromQueue('1');
    });

    expect(result.current.queue).not.toContain(message);
  });
});
