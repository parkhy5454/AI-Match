'use client';

interface SearchHistoryProps {
  items: string[];
  onSelect?: (query: string) => void;
  onDelete?: (query: string) => void;
}

export default function SearchHistory({ items, onSelect, onDelete }: SearchHistoryProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>최근 검색</h4>
      <div style={styles.list}>
        {items.map((item, index) => (
          <div key={index} style={styles.item}>
            <button
              onClick={() => onSelect?.(item)}
              style={styles.itemButton}
            >
              🔍 {item}
            </button>
            <button
              onClick={() => onDelete?.(item)}
              style={styles.deleteButton}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: 'white',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  title: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#999',
    margin: '0 0 12px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  itemButton: {
    flex: 1,
    background: 'none',
    border: 'none',
    textAlign: 'left' as const,
    fontSize: '13px',
    color: '#667eea',
    cursor: 'pointer',
    padding: '6px 8px',
    borderRadius: '4px',
    transition: 'background 0.2s',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    color: '#ccc',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px 6px',
  },
};