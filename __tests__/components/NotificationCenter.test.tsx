
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationCenter from '@/app/components/NotificationCenter';
import { useNotifications } from '@/app/hooks/useNotifications';

vi.mock('@/app/hooks/useNotifications');

describe('NotificationCenter', () => {
  it('renders notification bell icon', () => {
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [],
      loading: false,
      error: null,
      markAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      markAllAsRead: vi.fn(),
    });

    render(<NotificationCenter />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays unread count badge', () => {
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [
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
      ],
      loading: false,
      error: null,
      markAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      markAllAsRead: vi.fn(),
    });

    render(<NotificationCenter />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', () => {
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [],
      loading: false,
      error: null,
      markAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      markAllAsRead: vi.fn(),
    });

    render(<NotificationCenter />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByText('알림')).toBeInTheDocument();
  });

  it('displays notifications in dropdown', () => {
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [
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
      ],
      loading: false,
      error: null,
      markAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      markAllAsRead: vi.fn(),
    });

    render(<NotificationCenter />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByText('New Like')).toBeInTheDocument();
  });

  it('calls markAsRead on notification click', () => {
    const mockMarkAsRead = vi.fn();
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [
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
      ],
      loading: false,
      error: null,
      markAsRead: mockMarkAsRead,
      deleteNotification: vi.fn(),
      markAllAsRead: vi.fn(),
    });

    render(<NotificationCenter />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    // Click on the notification item
    const notification = screen.getByText('Someone liked you');
    fireEvent.click(notification);
    expect(mockMarkAsRead).toHaveBeenCalledWith('1');
  });

  it('calls deleteNotification on delete button click', () => {
    const mockDelete = vi.fn();
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [
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
      ],
      loading: false,
      error: null,
      markAsRead: vi.fn(),
      deleteNotification: mockDelete,
      markAllAsRead: vi.fn(),
    });

    render(<NotificationCenter />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    const deleteBtn = screen.getAllByText('✕')[0];
    fireEvent.click(deleteBtn);
    expect(mockDelete).toHaveBeenCalledWith('1');
  });

  it('displays loading state', () => {
    vi.mocked(useNotifications).mockReturnValue({
      notifications: [],
      loading: true,
      error: null,
      markAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      markAllAsRead: vi.fn(),
    });

    render(<NotificationCenter />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByText('로딩 중...')).toBeInTheDocument();
  });
});
