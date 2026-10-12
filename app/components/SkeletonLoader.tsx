'use client';

export function CardSkeleton() {
  return (
    <div style={styles.card}>
      <div style={styles.imageContainer} />
      <div style={styles.content}>
        <div style={styles.nameSkeletoncontainer}>
          <div style={styles.skeleton} />
          <div style={{...styles.skeleton, width: '40px'}} />
        </div>
        <div style={{...styles.skeleton, width: '60%'}} />
        <div style={{...styles.skeleton, width: '80%'}} />
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div style={styles.list}>
      {[...Array(3)].map((_, i) => (
        <div key={i} style={styles.listItem}>
          <div style={styles.imageSkeleton} />
          <div style={styles.listContent}>
            <div style={{...styles.skeleton, width: '60%'}} />
            <div style={{...styles.skeleton, width: '40%'}} />
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  card: {
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  imageContainer: {
    width: '100%',
    height: '450px',
    backgroundColor: '#e0e0e0',
    animation: 'pulse 1.5s infinite',
  },
  content: {
    padding: '20px',
  },
  nameSkeletoncontainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
  },
  skeleton: {
    height: '16px',
    backgroundColor: '#e0e0e0',
    borderRadius: '8px',
    flex: 1,
    animation: 'pulse 1.5s infinite',
  },
  list: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '12px',
  },
  listItem: {
    background: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  imageSkeleton: {
    width: '100%',
    height: '150px',
    backgroundColor: '#e0e0e0',
    animation: 'pulse 1.5s infinite',
  },
  listContent: {
    padding: '12px',
  },
};