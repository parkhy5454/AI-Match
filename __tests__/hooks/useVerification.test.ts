import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import axios from 'axios';
import { useVerification } from '@/app/hooks/useVerification';

vi.mock('axios');

describe('useVerification Hook', () => {
  it('initializes with null status', () => {
    const { result } = renderHook(() => useVerification());
    expect(result.current.status).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('fetches verification status', async () => {
    const mockStatus = {
      emailVerified: true,
      phoneVerified: false,
      photoVerified: true,
    };
    (axios.get as any).mockResolvedValue({ data: { data: mockStatus } });
    const { result } = renderHook(() => useVerification());

    await act(async () => {
      await result.current.fetchVerificationStatus();
    });

    expect(result.current.status).toEqual(mockStatus);
  });

  it('sends verification email', async () => {
    (axios.post as any).mockResolvedValue({ data: { success: true } });
    const { result } = renderHook(() => useVerification());

    const response = await act(async () => {
      return await result.current.sendVerificationEmail('test@example.com');
    });

    expect(response).toBe(true);
  });

  it('verifies email with token', async () => {
    (axios.post as any).mockResolvedValue({ data: { success: true } });
    const { result } = renderHook(() => useVerification());

    const response = await act(async () => {
      return await result.current.verifyEmail('token123');
    });

    expect(response).toBe(true);
  });

  it('uploads photo verification', async () => {
    (axios.post as any).mockResolvedValue({ data: { success: true } });
    const { result } = renderHook(() => useVerification());

    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const response = await act(async () => {
      return await result.current.uploadPhotoVerification(file);
    });

    expect(response).toBe(true);
  });
});