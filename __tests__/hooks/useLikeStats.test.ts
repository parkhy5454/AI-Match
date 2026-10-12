import { renderHook, act } from '@testing-library/react';
import { useLikeStats } from '@/app/hooks/useLikeStats';
import axios from 'axios';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios');

describe('useLikeStats Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with null stats', () => {
    const { result } = renderHook(() => useLikeStats());

    expect(result.current.stats).toBeNull();
    expect(result.current.dailyInfo).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches statistics successfully', async () => {
    const mockStats = {
      totalLikesReceived: 15,
      totalLikesSent: 50,
      totalSuperLikes: 3,
      totalMatches: 5,
      likeRatio: 0.3,
    };
    const mockResponse = { data: { data: mockStats } };
    vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useLikeStats());

    await act(async () => {
      await result.current.fetchStats();
    });

    expect(result.current.stats).toEqual(mockStats);
  });

  it('fetches daily info successfully', async () => {
    const mockDailyInfo = {
      remainingLikes: 75,
      remainingSuperLikes: 4,
      resetTime: '2026-10-12T00:00:00Z',
      isPremium: false,
    };
    const mockResponse = { data: { data: mockDailyInfo } };
    vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useLikeStats());

    await act(async () => {
      await result.current.fetchDailyInfo();
    });

    expect(result.current.dailyInfo).toEqual(mockDailyInfo);
  });

  it('handles fetch error', async () => {
    const errorResponse = {
      response: { data: { error: 'Failed to fetch stats' } },
    };
    vi.mocked(axios.get).mockRejectedValueOnce(errorResponse);

    const { result } = renderHook(() => useLikeStats());

    await act(async () => {
      await result.current.fetchStats();
    });

    expect(result.current.error).toBe('Failed to fetch stats');
    expect(result.current.stats).toBeNull();
  });
});