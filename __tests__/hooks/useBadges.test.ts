
import { renderHook, waitFor } from '@testing-library/react';
import { useBadges } from '@/app/hooks/useBadges';
import axios from 'axios';

vi.mock('axios');

describe('useBadges', () => {
  it('initializes with empty state', () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useBadges());

    expect(result.current.badges).toEqual([]);
    expect(result.current.unlockedBadges).toBe(0);
  });

  it('fetches badges on mount', async () => {
    const mockBadges = [
      {
        id: '1',
        name: 'First Match',
        isLocked: false,
      },
      {
        id: '2',
        name: 'Master',
        isLocked: true,
      },
    ];

    vi.mocked(axios.get).mockResolvedValue({ data: mockBadges });
    const { result } = renderHook(() => useBadges());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.badges).toEqual(mockBadges);
    expect(result.current.totalBadges).toBe(2);
    expect(result.current.unlockedBadges).toBe(1);
  });

  it('handles fetch error', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Fetch failed'));
    const { result } = renderHook(() => useBadges());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
