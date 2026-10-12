
import { renderHook, act } from '@testing-library/react';
import { useVideoCall } from '@/app/hooks/useVideoCall';

describe('useVideoCall', () => {
  it('initializes with idle state', () => {
    const { result } = renderHook(() => useVideoCall());

    expect(result.current.callState).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('starts a call', async () => {
    const { result } = renderHook(() => useVideoCall());

    await act(async () => {
      // Mock getUserMedia
      global.navigator.mediaDevices = {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [],
        }),
      } as any;

      await result.current.startCall('user123', 'John Doe');
    });

    expect(result.current.callState).not.toBeNull();
    expect(result.current.callState?.status).toBe('ringing');
  });

  it('toggles mute', async () => {
    const { result } = renderHook(() => useVideoCall());

    await act(async () => {
      global.navigator.mediaDevices = {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ enabled: true }],
        }),
      } as any;

      await result.current.startCall('user123', 'John Doe');
    });

    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.callState?.isMuted).toBe(true);
  });

  it('toggles video', async () => {
    const { result } = renderHook(() => useVideoCall());

    await act(async () => {
      global.navigator.mediaDevices = {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ enabled: true }],
        }),
      } as any;

      await result.current.startCall('user123', 'John Doe');
    });

    act(() => {
      result.current.toggleVideo();
    });

    expect(result.current.callState?.isVideoOn).toBe(false);
  });
});
