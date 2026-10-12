
import { render, screen } from '@testing-library/react';
import AchievementProgress from '@/app/components/AchievementProgress';

describe('AchievementProgress', () => {
  const mockAchievement = {
    id: '1',
    name: 'Love Expert',
    description: 'Receive 5 likes',
    icon: '❤️',
    category: 'likes',
    progress: 3,
    target: 5,
    reward: 100,
    isUnlocked: false,
  };

  it('renders achievement name and description', () => {
    render(<AchievementProgress achievement={mockAchievement} />);
    expect(screen.getByText('Love Expert')).toBeInTheDocument();
    expect(screen.getByText('Receive 5 likes')).toBeInTheDocument();
  });

  it('displays progress', () => {
    render(<AchievementProgress achievement={mockAchievement} />);
    expect(screen.getByText('3 / 5')).toBeInTheDocument();
  });

  it('shows unlock badge when unlocked', () => {
    const unlockedAchievement = { ...mockAchievement, isUnlocked: true };
    render(<AchievementProgress achievement={unlockedAchievement} />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('displays reward points', () => {
    render(<AchievementProgress achievement={mockAchievement} />);
    expect(screen.getByText(/100포인트/)).toBeInTheDocument();
  });
});
