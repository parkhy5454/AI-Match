
import { renderHook, act } from '@testing-library/react';
import { useScreenShare } from '@/app/hooks/useScreenShare';

describe('useScreenShare', () => {
  it('initializes with screen sharing disabled', () => {
    const { result } = renderHook(() => useScreenShare());

    expect(result.current.isScreenSharing).toBe(false);
    expect(result.current.screenStream).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('starts screen share', async () => {
    const { result } = renderHook(() => useScreenShare());

    global.navigator.mediaDevices = {
      getDisplayMedia: vi.fn().mockResolvedValue({
        getTracks: () => [
          {
            addEventListener: vi.fn(),
          },
        ],
      }),
    } as any;

    await act(async () => {
      await result.current.startScreenShare();
    });

    expect(result.current.isScreenSharing).toBe(true);
  });

  it('stops screen share', async () => {
    const { result } = renderHook(() => useScreenShare());

    global.navigator.mediaDevices = {
      getDisplayMedia: vi.fn().mockResolvedValue({
        getTracks: () => [
          {
            addEventListener: vi.fn(),
            stop: vi.fn(),
          },
        ],
      }),
    } as any;

    await act(async () => {
      await result.current.startScreenShare();
    });

    await act(async () => {
      await result.current.stopScreenShare();
    });

    expect(result.current.isScreenSharing).toBe(false);
  });
});
