import { renderHook, act } from '@testing-library/react';
import { useMatches } from '@/app/hooks/useMatches';
import axios from 'axios';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios');

describe('useMatches Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty matches', () => {
    const { result } = renderHook(() => useMatches());

    expect(result.current.matches).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches matches successfully', async () => {
    const mockMatches = [
      {
        id: 'match-1',
        userId: 'user-2',
        username: 'john',
        email: 'john@example.com',
        age: 28,
        region: '서울',
        mbti: 'ENFP',
      },
    ];
    const mockResponse = {
      data: { data: mockMatches },
    };
    vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useMatches());

    await act(async () => {
      await result.current.fetchMatches();
    });

    expect(result.current.matches).toEqual(mockMatches);
    expect(result.current.error).toBeNull();
  });

  it('fetches matches with pagination', async () => {
    const mockResponse = { data: { data: [] } };
    vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useMatches());

    await act(async () => {
      await result.current.fetchMatches(20, 40);
    });

    expect(axios.get).toHaveBeenCalledWith('/api/matches', {
      params: { limit: 20, offset: 40 },
    });
  });

  it('handles fetch error', async () => {
    const errorResponse = {
      response: { data: { error: 'Failed to fetch matches' } },
    };
    vi.mocked(axios.get).mockRejectedValueOnce(errorResponse);

    const { result } = renderHook(() => useMatches());

    await act(async () => {
      await result.current.fetchMatches();
    });

    expect(result.current.error).toBe('Failed to fetch matches');
    expect(result.current.matches).toEqual([]);
  });

  it('unmatches user successfully', async () => {
    const mockMatches = [
      { id: 'match-1', userId: 'user-2', username: 'john', email: 'john@example.com', age: 28, region: '서울', mbti: 'ENFP' },
      { id: 'match-2', userId: 'user-3', username: 'jane', email: 'jane@example.com', age: 26, region: '부산', mbti: 'INFP' },
    ];

    const mockResponse = { data: { data: mockMatches } };
    vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useMatches());

    await act(async () => {
      await result.current.fetchMatches();
    });

    const unmatchResponse = { data: { success: true } };
    vi.mocked(axios.delete).mockResolvedValueOnce(unmatchResponse);

    let unmatchResult;
    await act(async () => {
      unmatchResult = await result.current.unmatch('match-1');
    });

    expect(unmatchResult).toBe(true);
    expect(result.current.matches.length).toBe(1);
    expect(result.current.matches[0].id).toBe('match-2');
  });

  it('handles unmatch error', async () => {
    const errorResponse = {
      response: { data: { error: 'Cannot unmatch' } },
    };
    vi.mocked(axios.delete).mockRejectedValueOnce(errorResponse);

    const { result } = renderHook(() => useMatches());

    let unmatchResult;
    await act(async () => {
      unmatchResult = await result.current.unmatch('match-1');
    });

    expect(unmatchResult).toBe(false);
    expect(result.current.error).toBe('Cannot unmatch');
  });
});