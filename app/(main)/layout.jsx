import BottomNav from '@/components/BottomNav';

export default function MainLayout({ children }) {
  return (
    <>
      <div style={styles.container}>
        {children}
      </div>
      <BottomNav />
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    padding: '20px',
    paddingBottom: '90px',
  },
};
