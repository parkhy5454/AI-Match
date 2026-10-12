import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchResults from '@/app/components/SearchResults';

const mockResults = [
  {
    id: '1',
    username: 'alice',
    age: 25,
    region: 'Seoul',
    bio: 'Hello there',
    mbti: 'ENFP',
    compatibility: 85,
  },
  {
    id: '2',
    username: 'bob',
    age: 28,
    region: 'Busan',
    bio: 'Nice to meet you',
    mbti: 'INTJ',
    compatibility: 72,
  },
];

describe('SearchResults Component', () => {
  it('renders search results', () => {
    render(<SearchResults results={mockResults} />);
    expect(screen.getByText('검색 결과: 2명')).toBeInTheDocument();
    expect(screen.getByText('alice, 25')).toBeInTheDocument();
    expect(screen.getByText('bob, 28')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<SearchResults results={[]} loading={true} />);
    expect(screen.getByText('검색 중...')).toBeInTheDocument();
  });

  it('displays empty state', () => {
    render(<SearchResults results={[]} />);
    expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument();
  });

  it('displays compatibility percentage', () => {
    render(<SearchResults results={mockResults} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
  });

  it('displays user region', () => {
    render(<SearchResults results={mockResults} />);
    expect(screen.getByText('Seoul')).toBeInTheDocument();
    expect(screen.getByText('Busan')).toBeInTheDocument();
  });

  it('displays MBTI', () => {
    render(<SearchResults results={mockResults} />);
    expect(screen.getByText('ENFP')).toBeInTheDocument();
    expect(screen.getByText('INTJ')).toBeInTheDocument();
  });

  it('calls onUserClick', () => {
    const onUserClick = vi.fn();
    render(<SearchResults results={mockResults} onUserClick={onUserClick} />);

    const card = screen.getByText('alice, 25').closest('div');
    fireEvent.click(card!);

    expect(onUserClick).toHaveBeenCalledWith('1');
  });

  it('truncates long bio', () => {
    const resultWithLongBio = [{
      ...mockResults[0],
      bio: 'A'.repeat(150),
    }];

    render(<SearchResults results={resultWithLongBio} />);
    const bioText = screen.getByText(/A{100}/);
    expect(bioText.textContent).toContain('...');
  });

  it('renders grid layout for multiple results', () => {
    render(<SearchResults results={mockResults} />);
    const cards = screen.getAllByText(/Seoul|Busan/);
    expect(cards.length).toBeGreaterThan(0);
  });
});