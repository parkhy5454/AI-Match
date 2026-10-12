'use client';

interface FilterPanelProps {
  activeFilters: Record<string, any>;
  onClearFilter: (filterName: string) => void;
  onClearAll: () => void;
}

export default function FilterPanel({ activeFilters, onClearFilter, onClearAll }: FilterPanelProps) {
  const filters = Object.entries(activeFilters).filter(([_, value]) => {
    if (value === '' || value === null || (Array.isArray(value) && value.length === 0)) {
      return false;
    }
    return true;
  });

  if (filters.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.filterList}>
        {filters.map(([name, value]) => (
          <div key={name} style={styles.filterTag}>
            <span style={styles.filterText}>
              {name}: {Array.isArray(value) ? value.join(', ') : value}
            </span>
            <button
              onClick={() => onClearFilter(name)}
              style={styles.clearButton}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button onClick={onClearAll} style={styles.clearAllButton}>
        모든 필터 해제
      </button>
    </div>
  );
}

const styles = {
  container: {
    background: '#F5F5F5',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  filterList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginBottom: '12px',
  },
  filterTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'white',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid #ddd',
  },
  filterText: {
    fontSize: '13px',
    color: '#333',
  },
  clearButton: {
    background: 'none',
    border: 'none',
    color: '#999',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0',
  },
  clearAllButton: {
    fontSize: '13px',
    color: '#667eea',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
  },
};