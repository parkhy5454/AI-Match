import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import axios from 'axios';
import { useSavedSearches } from '@/app/hooks/useSavedSearches';

vi.mock('axios');

describe('useSavedSearches Hook', () => {
  it('fetches saved searches', async () => {
    const mockSearches = [
      { id: '1', name: 'My Search', filters: {} },
    ];
    (axios.get as any).mockResolvedValue({
      data: { data: mockSearches },
    });
    const { result } = renderHook(() => useSavedSearches());

    await act(async () => {
      await result.current.fetchSavedSearches();
    });

    expect(result.current.searches).toEqual(mockSearches);
  });

  it('saves search', async () => {
    const mockSearch = { id: '1', name: 'My Search', filters: {} };
    (axios.post as any).mockResolvedValue({
      data: { data: mockSearch },
    });
    const { result } = renderHook(() => useSavedSearches());

    await act(async () => {
      await result.current.saveSearch('My Search', {});
    });

    expect(result.current.searches).toContainEqual(mockSearch);
  });

  it('deletes search', async () => {
    (axios.delete as any).mockResolvedValue({ data: { success: true } });
    const { result } = renderHook(() => useSavedSearches());

    act(() => {
      result.current.deleteSearch('search-id');
    });

    expect(result.current.searches).toEqual([]);
  });
});