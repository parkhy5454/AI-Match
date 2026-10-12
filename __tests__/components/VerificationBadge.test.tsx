import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VerificationBadge from '@/app/components/VerificationBadge';

describe('VerificationBadge Component', () => {
  it('renders verified email badge', () => {
    render(<VerificationBadge type="email" verified={true} />);
    expect(screen.getByText('이메일')).toBeInTheDocument();
    expect(screen.getByText('✓ 인증됨')).toBeInTheDocument();
  });

  it('renders unverified email badge', () => {
    render(<VerificationBadge type="email" verified={false} />);
    expect(screen.getByText('이메일')).toBeInTheDocument();
    expect(screen.getByText('인증 필요')).toBeInTheDocument();
  });

  it('renders verified phone badge', () => {
    render(<VerificationBadge type="phone" verified={true} />);
    expect(screen.getByText('전화번호')).toBeInTheDocument();
  });

  it('renders verified photo badge', () => {
    render(<VerificationBadge type="photo" verified={true} />);
    expect(screen.getByText('사진')).toBeInTheDocument();
  });

  it('calls onClick handler', () => {
    const onClick = vi.fn();
    render(<VerificationBadge type="email" verified={false} onClick={onClick} />);
    const badge = screen.getByRole('button');
    fireEvent.click(badge);
    expect(onClick).toHaveBeenCalled();
  });
});