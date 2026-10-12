
import { render, screen } from '@testing-library/react';
import LeaderboardBadges from '@/app/components/LeaderboardBadges';

describe('LeaderboardBadges', () => {
  const mockUsers = [
    {
      id: '1',
      username: 'Alice',
      badges: 10,
      totalPoints: 500,
      rank: 1,
    },
    {
      id: '2',
      username: 'Bob',
      badges: 8,
      totalPoints: 400,
      rank: 2,
    },
    {
      id: '3',
      username: 'Charlie',
      badges: 6,
      totalPoints: 300,
      rank: 3,
    },
  ];

  it('renders leaderboard', () => {
    render(<LeaderboardBadges users={mockUsers} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('displays medals for top 3', () => {
    render(<LeaderboardBadges users={mockUsers} />);
    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('🥉')).toBeInTheDocument();
  });

  it('shows badge counts', () => {
    render(<LeaderboardBadges users={mockUsers} />);
    expect(screen.getByText('10개')).toBeInTheDocument();
    expect(screen.getByText('8개')).toBeInTheDocument();
  });
});
