
import { renderHook, waitFor } from '@testing-library/react';
import { useLeaderboard } from '@/app/hooks/useLeaderboard';
import axios from 'axios';

vi.mock('axios');

describe('useLeaderboard', () => {
  it('initializes with empty leaderboard', () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { leaderboard: [], userRank: undefined },
    });
    const { result } = renderHook(() => useLeaderboard());

    expect(result.current.leaderboard).toEqual([]);
  });

  it('fetches leaderboard data', async () => {
    const mockData = {
      leaderboard: [
        { id: '1', username: 'Alice', badges: 10, rank: 1 },
        { id: '2', username: 'Bob', badges: 8, rank: 2 },
      ],
      userRank: { id: '1', username: 'Alice', badges: 10, rank: 1 },
    };

    vi.mocked(axios.get).mockResolvedValue({ data: mockData });
    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.leaderboard).toHaveLength(2);
    expect(result.current.userRank).toBeDefined();
  });
});
