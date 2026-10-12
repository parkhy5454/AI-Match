import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOptimizedChat } from '@/app/hooks/useOptimizedChat';

describe('useOptimizedChat', () => {
  it('should initialize with empty messages', () => {
    const { result } = renderHook(() => useOptimizedChat('user-123'));
    expect(result.current.messages).toEqual([]);
  });

  it('should be loading initially', () => {
    const { result } = renderHook(() => useOptimizedChat('user-123'));
    expect(result.current.loading).toBe(true);
  });

  it('should have null error initially', () => {
    const { result } = renderHook(() => useOptimizedChat('user-123'));
    expect(result.current.error).toBeNull();
  });
});
