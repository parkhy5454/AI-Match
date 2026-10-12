
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from '@/app/hooks/useNotifications';
import axios from 'axios';

vi.mock('axios');

describe('useNotifications', () => {
  it('initializes with empty state', () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useNotifications());
    expect(result.current.notifications).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('fetches notifications on mount', async () => {
    const mockNotifications = [
      {
        id: '1',
        type: 'like',
        title: 'New Like',
        message: 'Someone liked you',
        read: false,
        image: '',
        createdAt: new Date(),
        actionUrl: '',
      },
    ];

    vi.mocked(axios.get).mockResolvedValue({ data: mockNotifications });
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toEqual(mockNotifications);
  });

  it('marks notification as read', async () => {
    vi.mocked(axios.put).mockResolvedValue({
      data: { id: '1', read: true },
    });

    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.markAsRead('1');
    });

    expect(axios.put).toHaveBeenCalledWith('/api/notification/1/read');
  });

  it('deletes notification', async () => {
    vi.mocked(axios.delete).mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.deleteNotification('1');
    });

    expect(axios.delete).toHaveBeenCalledWith('/api/notification/1');
  });

  it('marks all as read', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useNotifications());
    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(axios.post).toHaveBeenCalledWith('/api/notification/read-all');
  });

  it('handles fetch error', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
