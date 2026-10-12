import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTrustScore } from '@/app/hooks/useTrustScore';

describe('useTrustScore', () => {
  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useTrustScore('user-123'));
    expect(result.current.loading).toBe(true);
  });

  it('should have null trust score initially', () => {
    const { result } = renderHook(() => useTrustScore('user-123'));
    expect(result.current.trustScore).toBeNull();
  });

  it('should have null error initially', () => {
    const { result } = renderHook(() => useTrustScore('user-123'));
    expect(result.current.error).toBeNull();
  });
});
