
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CallButton from '@/app/components/CallButton';

describe('CallButton', () => {
  it('renders call button', () => {
    render(
      <CallButton
        recipientId="user123"
        recipientName="John Doe"
      />
    );

    expect(screen.getByText('📹 통화')).toBeInTheDocument();
  });

  it('shows loading state when clicked', async () => {
    const onCallStart = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <CallButton
        recipientId="user123"
        recipientName="John Doe"
        onCallStart={onCallStart}
      />
    );

    const button = screen.getByText('📹 통화');
    fireEvent.click(button);

    expect(screen.getByText('연결 중...')).toBeInTheDocument();
  });

  it('calls onCallStart with correct recipientId', async () => {
    const onCallStart = vi.fn();

    render(
      <CallButton
        recipientId="user123"
        recipientName="John Doe"
        onCallStart={onCallStart}
      />
    );

    const button = screen.getByText('📹 통화');
    fireEvent.click(button);

    await waitFor(() => {
      expect(onCallStart).toHaveBeenCalledWith('user123');
    });
  });
});
