'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProfileForm from '@/app/components/ProfileForm';
import PhotoUploader from '@/app/components/PhotoUploader';
import VerificationBadge from '@/app/components/VerificationBadge';
import { useProfileManager } from '@/app/hooks/useProfileManager';
import { useVerification } from '@/app/hooks/useVerification';

export default function ProfilePage() {
  const router = useRouter();
  const { profile, loading: profileLoading, fetchProfile } = useProfileManager();
  const { status, fetchVerificationStatus } = useVerification();

  useEffect(() => {
    fetchProfile();
    fetchVerificationStatus();
  }, []);

  if (profileLoading) {
    return <div style={styles.loading}>프로필 로드 중...</div>;
  }

  if (!profile) {
    return <div style={styles.error}>프로필을 로드할 수 없습니다</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>프로필 관리</h1>
      </div>

      <div style={styles.grid}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>프로필 정보</h2>
          <ProfileForm
            profile={profile}
            onSuccess={fetchProfile}
          />
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>사진</h2>
          <PhotoUploader onSuccess={fetchProfile} />
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>계정 인증</h2>
          {status && (
            <div style={styles.verificationList}>
              <VerificationBadge
                type="email"
                verified={status.emailVerified}
              />
              <VerificationBadge
                type="phone"
                verified={status.phoneVerified}
              />
              <VerificationBadge
                type="photo"
                verified={status.photoVerified}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px',
  } as const,
  header: {
    marginBottom: '30px',
  } as const,
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0',
  } as const,
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  } as const,
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  } as const,
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    marginTop: '0',
    marginBottom: '20px',
  } as const,
  verificationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  } as const,
  loading: {
    textAlign: 'center' as const,
    padding: '40px',
    fontSize: '16px',
    color: '#666',
  },
  error: {
    textAlign: 'center' as const,
    padding: '40px',
    fontSize: '16px',
    color: '#FF3B30',
  },
} as const;