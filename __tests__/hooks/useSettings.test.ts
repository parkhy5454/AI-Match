import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import axios from 'axios';
import { useSettings } from '@/app/hooks/useSettings';

vi.mock('axios');

const mockSettings = {
  notificationsEnabled: true,
  emailNotifications: true,
  pushNotifications: false,
  privateProfile: false,
  showOnlineStatus: true,
};

describe('useSettings Hook', () => {
  it('initializes with null settings', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('fetches settings successfully', async () => {
    (axios.get as any).mockResolvedValue({ data: { data: mockSettings } });
    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.fetchSettings();
    });

    expect(result.current.settings).toEqual(mockSettings);
  });

  it('updates settings', async () => {
    const updatedSettings = { ...mockSettings, privateProfile: true };
    (axios.put as any).mockResolvedValue({ data: { data: updatedSettings } });
    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateSettings({ privateProfile: true });
    });

    expect(result.current.settings).toEqual(updatedSettings);
  });

  it('handles settings error', async () => {
    (axios.get as any).mockRejectedValue({
      response: { data: { error: '설정 조회 실패' } },
    });
    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.fetchSettings();
    });

    expect(result.current.error).toBe('설정 조회 실패');
  });
});