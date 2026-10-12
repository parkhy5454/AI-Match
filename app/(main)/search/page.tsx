'use client';

import { useEffect, useState } from 'react';
import SearchForm from '@/app/components/SearchForm';
import SearchResults from '@/app/components/SearchResults';
import FilterPanel from '@/app/components/FilterPanel';
import SearchHistory from '@/app/components/SearchHistory';
import { useAdvancedSearch } from '@/app/hooks/useAdvancedSearch';
import { useSearchHistory } from '@/app/hooks/useSearchHistory';

interface SearchFilters {
  ageMin: number;
  ageMax: number;
  region: string;
  mbti: string;
  interests: string[];
  gender: string;
  distance?: number;
}

export default function SearchPage() {
  const { results, loading, search, lastFilters, clearResults } = useAdvancedSearch();
  const { history, addToHistory, deleteFromHistory } = useSearchHistory();
  const [activeFilters, setActiveFilters] = useState<SearchFilters | null>(null);

  const handleSearch = async (filters: SearchFilters) => {
    setActiveFilters(filters);
    await search(filters);
    addToHistory(JSON.stringify(filters));
  };

  const handleSelectHistory = (query: string) => {
    const filters = JSON.parse(query);
    setActiveFilters(filters);
    search(filters);
  };

  const handleClearFilter = (filterName: string) => {
    if (activeFilters) {
      const newFilters = { ...activeFilters };
      delete newFilters[filterName as keyof SearchFilters];
      setActiveFilters(newFilters);
      search(newFilters);
    }
  };

  const handleClearAll = () => {
    setActiveFilters(null);
    clearResults();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>사람 찾기</h1>
        <p style={styles.subtitle}>원하는 조건으로 상대를 검색해보세요</p>
      </div>

      <SearchForm onSearch={handleSearch} />

      {activeFilters && (
        <FilterPanel
          activeFilters={activeFilters}
          onClearFilter={handleClearFilter}
          onClearAll={handleClearAll}
        />
      )}

      {!activeFilters && (
        <SearchHistory
          items={history.slice(0, 5)}
          onSelect={handleSelectHistory}
          onDelete={deleteFromHistory}
        />
      )}

      <SearchResults
        results={results}
        loading={loading}
        onUserClick={(userId) => {
          // Navigate to user profile
          window.location.href = `/profile/${userId}`;
        }}
      />
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0',
  },
};