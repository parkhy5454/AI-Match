
import { render, screen, fireEvent } from '@testing-library/react';
import VideoCallModal from '@/app/components/VideoCallModal';

describe('VideoCallModal', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <VideoCallModal
        isOpen={false}
        recipientId="user123"
        recipientName="John Doe"
        onClose={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders incoming call state', () => {
    render(
      <VideoCallModal
        isOpen={true}
        recipientId="user123"
        recipientName="John Doe"
        isIncoming={true}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('영상 통화 중...')).toBeInTheDocument();
  });

  it('renders connecting state', () => {
    render(
      <VideoCallModal
        isOpen={true}
        recipientId="user123"
        recipientName="John Doe"
        isCaller={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('연결 중...')).toBeInTheDocument();
  });

  it('calls onAccept when accept button is clicked', () => {
    const onAccept = vi.fn();
    render(
      <VideoCallModal
        isOpen={true}
        recipientId="user123"
        recipientName="John Doe"
        isIncoming={true}
        onAccept={onAccept}
        onReject={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const acceptBtn = screen.getByText('✓');
    fireEvent.click(acceptBtn);
    expect(onAccept).toHaveBeenCalled();
  });

  it('calls onReject when reject button is clicked', () => {
    const onReject = vi.fn();
    render(
      <VideoCallModal
        isOpen={true}
        recipientId="user123"
        recipientName="John Doe"
        isIncoming={true}
        onAccept={vi.fn()}
        onReject={onReject}
        onClose={vi.fn()}
      />
    );

    const rejectBtn = screen.getByText('✕');
    fireEvent.click(rejectBtn);
    expect(onReject).toHaveBeenCalled();
  });
});
