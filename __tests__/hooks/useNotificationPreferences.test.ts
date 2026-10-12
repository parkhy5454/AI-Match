
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotificationPreferences } from '@/app/hooks/useNotificationPreferences';
import axios from 'axios';

vi.mock('axios');

describe('useNotificationPreferences', () => {
  it('initializes with default preferences', () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        emailNotifications: true,
        pushNotifications: true,
        likeNotifications: true,
        matchNotifications: true,
        messageNotifications: true,
        systemNotifications: true,
        notificationFrequency: 'instant',
      },
    });

    const { result } = renderHook(() => useNotificationPreferences());
    expect(result.current.preferences).toBeTruthy();
  });

  it('fetches preferences on mount', async () => {
    const mockPreferences = {
      emailNotifications: true,
      pushNotifications: false,
      likeNotifications: true,
      matchNotifications: true,
      messageNotifications: true,
      systemNotifications: false,
      notificationFrequency: 'daily',
    };

    vi.mocked(axios.get).mockResolvedValue({ data: mockPreferences });

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.preferences).toEqual(mockPreferences);
  });

  it('updates preferences', async () => {
    const mockPreferences = {
      emailNotifications: true,
      pushNotifications: true,
      likeNotifications: true,
      matchNotifications: true,
      messageNotifications: true,
      systemNotifications: true,
      notificationFrequency: 'instant',
    };

    vi.mocked(axios.get).mockResolvedValue({ data: mockPreferences });
    vi.mocked(axios.put).mockResolvedValue({
      data: { ...mockPreferences, emailNotifications: false },
    });

    const { result } = renderHook(() => useNotificationPreferences());

    await act(async () => {
      await result.current.updatePreferences({
        emailNotifications: false,
      });
    });

    expect(axios.put).toHaveBeenCalledWith(
      '/api/notification/preferences',
      expect.objectContaining({ emailNotifications: false })
    );
  });

  it('handles fetch error', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() => useNotificationPreferences());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
