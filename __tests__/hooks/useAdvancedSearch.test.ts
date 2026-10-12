import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import axios from 'axios';
import { useAdvancedSearch } from '@/app/hooks/useAdvancedSearch';

vi.mock('axios');

const mockResults = [
  {
    id: '1',
    username: 'alice',
    age: 25,
    region: 'Seoul',
    mbti: 'ENFP',
  },
];

describe('useAdvancedSearch Hook', () => {
  it('initializes with empty state', () => {
    const { result } = renderHook(() => useAdvancedSearch());
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('searches with filters', async () => {
    (axios.get as any).mockResolvedValue({ data: { data: mockResults } });
    const { result } = renderHook(() => useAdvancedSearch());

    await act(async () => {
      await result.current.search({ ageMin: 20, ageMax: 30, region: 'Seoul' });
    });

    expect(result.current.results).toEqual(mockResults);
    expect(result.current.lastFilters).toBeDefined();
  });

  it('handles search error', async () => {
    (axios.get as any).mockRejectedValue({
      response: { data: { error: '검색 실패' } },
    });
    const { result } = renderHook(() => useAdvancedSearch());

    await act(async () => {
      await result.current.search({ ageMin: 20, ageMax: 30 });
    });

    expect(result.current.error).toBe('검색 실패');
    expect(result.current.results).toEqual([]);
  });

  it('clears results', () => {
    const { result } = renderHook(() => useAdvancedSearch());

    act(() => {
      result.current.clearResults();
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.lastFilters).toBeNull();
  });
});