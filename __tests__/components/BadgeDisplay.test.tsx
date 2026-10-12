
import { render, screen } from '@testing-library/react';
import BadgeDisplay from '@/app/components/BadgeDisplay';

describe('BadgeDisplay', () => {
  const mockBadges = [
    {
      id: '1',
      name: 'First Match',
      description: '첫 매칭 완성',
      icon: '💕',
      rarity: 'common',
      isLocked: false,
      unlockedAt: new Date(),
    },
    {
      id: '2',
      name: 'Master Matcher',
      description: '10명 매칭',
      icon: '👑',
      rarity: 'legendary',
      isLocked: true,
    },
  ];

  it('renders badges', () => {
    render(<BadgeDisplay badges={mockBadges} />);
    expect(screen.getByText('💕')).toBeInTheDocument();
    expect(screen.getByText('👑')).toBeInTheDocument();
  });

  it('shows unlock icon for locked badges', () => {
    render(<BadgeDisplay badges={mockBadges} />);
    const lockIcons = screen.getAllByText('🔒');
    expect(lockIcons).toHaveLength(1);
  });

  it('renders different sizes', () => {
    const { container } = render(
      <BadgeDisplay badges={mockBadges} size="large" />
    );
    expect(container.firstChild).toHaveClass('large');
  });
});
