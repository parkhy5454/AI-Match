
import { renderHook, waitFor } from '@testing-library/react';
import { useAchievements } from '@/app/hooks/useAchievements';
import axios from 'axios';

vi.mock('axios');

describe('useAchievements', () => {
  it('initializes with empty state', () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useAchievements());

    expect(result.current.achievements).toEqual([]);
    expect(result.current.totalPoints).toBe(0);
  });

  it('calculates total points', async () => {
    const mockAchievements = [
      {
        id: '1',
        name: 'First Match',
        reward: 50,
        isUnlocked: true,
      },
      {
        id: '2',
        name: 'Master',
        reward: 200,
        isUnlocked: true,
      },
      {
        id: '3',
        name: 'Locked',
        reward: 100,
        isUnlocked: false,
      },
    ];

    vi.mocked(axios.get).mockResolvedValue({ data: mockAchievements });
    const { result } = renderHook(() => useAchievements());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totalPoints).toBe(250);
  });
});
