import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import axios from 'axios';
import { useProfileManager } from '@/app/hooks/useProfileManager';

vi.mock('axios');

const mockProfile = {
  id: 'user1',
  username: 'testuser',
  email: 'test@example.com',
  bio: 'Hello',
  age: 25,
  gender: 'male',
  region: 'Seoul',
  mbti: 'ENFP',
};

describe('useProfileManager Hook', () => {
  it('initializes with null profile', () => {
    const { result } = renderHook(() => useProfileManager());
    expect(result.current.profile).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches profile successfully', async () => {
    (axios.get as any).mockResolvedValue(mockProfile);
    const { result } = renderHook(() => useProfileManager());

    await act(async () => {
      await result.current.fetchProfile();
    });

    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch error', async () => {
    (axios.get as any).mockRejectedValue({
      response: { data: { error: '프로필 조회 실패' } },
    });
    const { result } = renderHook(() => useProfileManager());

    await act(async () => {
      await result.current.fetchProfile();
    });

    expect(result.current.error).toBe('프로필 조회 실패');
    expect(result.current.profile).toBeNull();
  });

  it('updates profile successfully', async () => {
    const updatedProfile = { ...mockProfile, age: 26 };
    (axios.put as any).mockResolvedValue(updatedProfile);
    const { result } = renderHook(() => useProfileManager());

    await act(async () => {
      await result.current.updateProfile({ age: 26 });
    });

    expect(result.current.profile).toEqual(updatedProfile);
  });

  it('handles update error', async () => {
    (axios.put as any).mockRejectedValue({
      response: { data: { error: '프로필 업데이트 실패' } },
    });
    const { result } = renderHook(() => useProfileManager());

    await act(async () => {
      await result.current.updateProfile({ age: 26 });
    });

    expect(result.current.error).toBe('프로필 업데이트 실패');
  });
});