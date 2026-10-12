import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import axios from 'axios';
import { useSearchHistory } from '@/app/hooks/useSearchHistory';

vi.mock('axios');

describe('useSearchHistory Hook', () => {
  it('fetches search history', async () => {
    (axios.get as any).mockResolvedValue({
      data: { data: ['search1', 'search2'] },
    });
    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      await result.current.fetchHistory();
    });

    expect(result.current.history).toEqual(['search1', 'search2']);
  });

  it('adds to history', async () => {
    (axios.post as any).mockResolvedValue({ data: { success: true } });
    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      await result.current.addToHistory('new search');
    });

    expect(result.current.history[0]).toBe('new search');
  });

  it('deletes from history', async () => {
    (axios.delete as any).mockResolvedValue({ data: { success: true } });
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.deleteFromHistory('old search');
    });

    expect(result.current.history).not.toContain('old search');
  });
});