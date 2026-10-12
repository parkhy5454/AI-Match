import { renderHook, act } from '@testing-library/react';
import { useLikeSystem } from '@/app/hooks/useLikeSystem';
import axios from 'axios';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios');

describe('useLikeSystem Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useLikeSystem());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sends like successfully', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: { id: 'like-1', fromUserId: '1', toUserId: '2', likeType: 'like' },
      },
    };
    vi.mocked(axios.post).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useLikeSystem());

    let response;
    await act(async () => {
      response = await result.current.sendLike('user-2', 'like');
    });

    expect(response?.success).toBe(true);
    expect(response?.data).toEqual(mockResponse.data.data);
    expect(result.current.error).toBeNull();
  });

  it('sends superlike successfully', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: { id: 'like-1', fromUserId: '1', toUserId: '2', likeType: 'superlike' },
      },
    };
    vi.mocked(axios.post).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useLikeSystem());

    let response;
    await act(async () => {
      response = await result.current.sendLike('user-2', 'superlike');
    });

    expect(response?.success).toBe(true);
  });

  it('handles like error', async () => {
    const errorResponse = {
      response: {
        data: { error: 'User already liked' },
      },
    };
    vi.mocked(axios.post).mockRejectedValueOnce(errorResponse);

    const { result } = renderHook(() => useLikeSystem());

    let response;
    await act(async () => {
      response = await result.current.sendLike('user-2', 'like');
    });

    expect(response?.success).toBe(false);
    expect(response?.error).toBe('User already liked');
  });

  it('sends pass successfully', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: { id: 'pass-1' },
      },
    };
    vi.mocked(axios.post).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useLikeSystem());

    let response;
    await act(async () => {
      response = await result.current.sendPass('user-2');
    });

    expect(response?.success).toBe(true);
  });

  it('checks if user liked another user', async () => {
    const mockResponse = {
      data: {
        data: {
          liked: true,
          likeType: 'like',
        },
      },
    };
    vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useLikeSystem());

    let response;
    await act(async () => {
      response = await result.current.checkLike('user-2');
    });

    expect(response?.liked).toBe(true);
    expect(response?.likeType).toBe('like');
  });

  it('sets loading state during operation', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: { id: 'like-1' },
      },
    };
    let resolvePost: any;
    vi.mocked(axios.post).mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePost = resolve;
      })
    );

    const { result } = renderHook(() => useLikeSystem());

    const promise = act(async () => {
      await result.current.sendLike('user-2', 'like');
    });

    expect(result.current.loading).toBe(true);

    resolvePost(mockResponse);
    await promise;

    expect(result.current.loading).toBe(false);
  });
});