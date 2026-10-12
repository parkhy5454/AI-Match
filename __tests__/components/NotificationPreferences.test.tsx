
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationPreferences from '@/app/components/NotificationPreferences';
import { useNotificationPreferences } from '@/app/hooks/useNotificationPreferences';

vi.mock('@/app/hooks/useNotificationPreferences');

describe('NotificationPreferences', () => {
  it('renders preference sections', () => {
    vi.mocked(useNotificationPreferences).mockReturnValue({
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        likeNotifications: true,
        matchNotifications: true,
        messageNotifications: true,
        systemNotifications: true,
        notificationFrequency: 'instant',
      },
      loading: false,
      error: null,
      updatePreferences: vi.fn(),
    });

    render(<NotificationPreferences />);
    expect(screen.getByText('알림 채널')).toBeInTheDocument();
    expect(screen.getByText('알림 유형')).toBeInTheDocument();
    expect(screen.getByText('알림 빈도')).toBeInTheDocument();
  });

  it('toggles email notifications', async () => {
    const mockUpdate = vi.fn();
    vi.mocked(useNotificationPreferences).mockReturnValue({
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        likeNotifications: true,
        matchNotifications: true,
        messageNotifications: true,
        systemNotifications: true,
        notificationFrequency: 'instant',
      },
      loading: false,
      error: null,
      updatePreferences: mockUpdate,
    });

    render(<NotificationPreferences />);
    const emailToggle = screen.getByLabelText('이메일');
    fireEvent.click(emailToggle);
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  it('changes notification frequency', async () => {
    const mockUpdate = vi.fn();
    vi.mocked(useNotificationPreferences).mockReturnValue({
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        likeNotifications: true,
        matchNotifications: true,
        messageNotifications: true,
        systemNotifications: true,
        notificationFrequency: 'instant',
      },
      loading: false,
      error: null,
      updatePreferences: mockUpdate,
    });

    render(<NotificationPreferences />);
    const dailyBtn = screen.getByText('매일');
    fireEvent.click(dailyBtn);
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  it('displays save button with loading state', () => {
    vi.mocked(useNotificationPreferences).mockReturnValue({
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        likeNotifications: true,
        matchNotifications: true,
        messageNotifications: true,
        systemNotifications: true,
        notificationFrequency: 'instant',
      },
      loading: true,
      error: null,
      updatePreferences: vi.fn(),
    });

    render(<NotificationPreferences />);
    const saveBtn = screen.getByText('저장 중...');
    expect(saveBtn).toBeDisabled();
  });
});
