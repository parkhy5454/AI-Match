import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterPanel from '@/app/components/FilterPanel';

describe('FilterPanel Component', () => {
  it('renders filter tags', () => {
    const activeFilters = {
      region: 'Seoul',
      mbti: 'ENFP',
    };

    render(
      <FilterPanel
        activeFilters={activeFilters}
        onClearFilter={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText(/region: Seoul/)).toBeInTheDocument();
    expect(screen.getByText(/mbti: ENFP/)).toBeInTheDocument();
  });

  it('hides when no active filters', () => {
    const { container } = render(
      <FilterPanel
        activeFilters={{}}
        onClearFilter={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('clears individual filter', () => {
    const onClearFilter = vi.fn();
    const activeFilters = {
      region: 'Seoul',
      mbti: 'ENFP',
    };

    render(
      <FilterPanel
        activeFilters={activeFilters}
        onClearFilter={onClearFilter}
        onClearAll={vi.fn()}
      />
    );

    const clearButtons = screen.getAllByText('✕');
    fireEvent.click(clearButtons[0]);

    expect(onClearFilter).toHaveBeenCalled();
  });

  it('clears all filters', () => {
    const onClearAll = vi.fn();
    const activeFilters = {
      region: 'Seoul',
      mbti: 'ENFP',
    };

    render(
      <FilterPanel
        activeFilters={activeFilters}
        onClearFilter={vi.fn()}
        onClearAll={onClearAll}
      />
    );

    const clearAllButton = screen.getByText('모든 필터 해제');
    fireEvent.click(clearAllButton);

    expect(onClearAll).toHaveBeenCalled();
  });

  it('handles array values in filters', () => {
    const activeFilters = {
      interests: ['영화', '음악'],
    };

    render(
      <FilterPanel
        activeFilters={activeFilters}
        onClearFilter={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText(/interests: 영화, 음악/)).toBeInTheDocument();
  });
});