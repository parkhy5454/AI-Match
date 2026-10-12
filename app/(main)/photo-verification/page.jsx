'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function PhotoVerificationPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profilePhotoVerified, setProfilePhotoVerified] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [useCamera, setUseCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    if (!hydrated) {
      console.log('[PhotoVerification] AuthContext 하이드레이션 대기 중...');
      return;
    }

    fetchVerifications();
  }, [hydrated]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('[PhotoVerification] API 요청: /api/photo-verification');
      const response = await axios.get('/api/photo-verification', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setVerifications(response.data.data || []);
      setProfilePhotoVerified(response.data.profilePhotoVerified || false);
      console.log('[PhotoVerification] 데이터 로드 성공');
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('[PhotoVerification] 인증 실패, 로그인 페이지로 이동');
        router.push('/login');
      } else {
        const errorMsg = err.response?.data?.error || '사진 인증 정보 로드에 실패했습니다';
        setError(errorMsg);
        console.error('[PhotoVerification] API 에러:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPhoto(file);
    }
  };

  const uploadPhoto = async (file) => {
    try {
      setUploading(true);
      setError('');
      setSuccess('');

      // 파일 크기 체크 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('사진은 5MB 이하여야 합니다');
        setUploading(false);
        return;
      }

      // 파일 타입 체크
      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 업로드 가능합니다');
        setUploading(false);
        return;
      }

      // Base64로 변환
      const reader = new FileReader();
      reader.onload = async (e) => {
        const photoBase64 = e.target?.result;

        try {
          const token = localStorage.getItem('accessToken');
          console.log('[PhotoVerification] 사진 업로드 시작');

          const response = await axios.post(
            '/api/photo-verification',
            {
              photoBase64,
              fileName: file.name,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          console.log('[PhotoVerification] 업로드 완료:', response.data);

          if (response.data.data.verified) {
            setSuccess('✅ ' + response.data.data.message);
            setProfilePhotoVerified(true);
          } else {
            setError('❌ ' + response.data.data.message);
          }

          // 목록 갱신
          await fetchVerifications();
        } catch (uploadErr) {
          const errorMsg = uploadErr.response?.data?.error || '사진 업로드에 실패했습니다';
          setError(errorMsg);
          console.error('[PhotoVerification] 업로드 에러:', uploadErr);
        } finally {
          setUploading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError('사진 처리 중 오류가 발생했습니다');
      setUploading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      setError('카메라 접근이 거부되었습니다. 브라우저 설정을 확인해주세요.');
      console.error('카메라 접근 실패:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;

      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const photoBase64 = canvasRef.current.toDataURL('image/jpeg');

        // Base64 문자열을 Blob으로 변환
        fetch(photoBase64)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            uploadPhoto(file);
            stopCamera();
          });
      }
    }
  };

  if (loading) {
    return (
      <>
        <TopNav />
        <div style={styles.container}>
          <div style={styles.loadingSpinner}>로딩 중...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav />
      <div style={styles.container}>
        {/* 페이지 제목 */}
        <div style={styles.pageHeader}>
          <Link href="/dashboard" style={styles.backLink}>
            ← 뒤로 가기
          </Link>
          <h1 style={styles.title}>📸 사진 인증</h1>
          <p style={styles.subtitle}>프로필 사진 인증으로 신뢰도를 높이세요</p>
        </div>

        {/* 인증 상태 카드 */}
        <div style={{...styles.statusCard, ...(!profilePhotoVerified ? styles.statusCardPending : styles.statusCardVerified)}}>
          <div style={styles.statusIcon}>
            {profilePhotoVerified ? '✅' : '⏳'}
          </div>
          <div style={styles.statusText}>
            <h3 style={styles.statusTitle}>
              {profilePhotoVerified ? '인증 완료' : '인증 대기 중'}
            </h3>
            <p style={styles.statusDesc}>
              {profilePhotoVerified
                ? '프로필 사진 인증이 완료되었습니다. 다른 사용자들에게 더 신뢰할 수 있는 프로필로 보여집니다.'
                : '명확한 정면 사진을 업로드해주세요. 최소한 얼굴이 80% 이상 보이는 사진이 필요합니다.'}
            </p>
          </div>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p style={{ margin: 0 }}>⚠️ {error}</p>
          </div>
        )}

        {success && (
          <div style={styles.successCard}>
            <p style={{ margin: 0 }}>{success}</p>
          </div>
        )}

        {/* 업로드 섹션 */}
        {!profilePhotoVerified && (
          <div style={styles.uploadCard}>
            <h2 style={styles.cardTitle}>📤 사진 업로드</h2>
            <p style={styles.cardSubtitle}>
              파일을 선택하거나 카메라를 사용하여 사진을 업로드하세요.
            </p>

            {!useCamera ? (
              <div style={styles.uploadOptions}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{
                    ...styles.uploadButton,
                    opacity: uploading ? 0.6 : 1,
                  }}
                >
                  📁 파일 선택
                </button>
                <button
                  onClick={() => {
                    setUseCamera(true);
                    startCamera();
                  }}
                  disabled={uploading}
                  style={{
                    ...styles.uploadButton,
                    background: '#28a745',
                    opacity: uploading ? 0.6 : 1,
                  }}
                >
                  📷 카메라 사용
                </button>
              </div>
            ) : (
              <div style={styles.cameraSection}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={styles.video}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div style={styles.cameraButtons}>
                  <button
                    onClick={capturePhoto}
                    disabled={uploading || !cameraActive}
                    style={styles.captureButton}
                  >
                    📸 촬영
                  </button>
                  <button
                    onClick={stopCamera}
                    style={{...styles.uploadButton, background: '#6c757d'}}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={uploading}
            />

            <p style={styles.uploadHint}>
              ℹ️ 최대 파일 크기: 5MB | 권장 형식: JPEG, PNG
            </p>
            <p style={styles.uploadHint}>
              💡 Tip: 명확한 정면 사진, 자연광에서 촬영된 사진이 인증 성공률이 높습니다.
            </p>

            {uploading && (
              <div style={styles.uploadProgress}>
                <p>업로드 중... 잠시만 기다려주세요.</p>
              </div>
            )}
          </div>
        )}

        {/* 인증 이력 */}
        {verifications.length > 0 && (
          <div style={styles.historyCard}>
            <h2 style={styles.cardTitle}>📋 인증 이력</h2>
            <div style={styles.verificationsList}>
              {verifications.map((verification, idx) => (
                <div
                  key={verification.id}
                  style={{
                    ...styles.verificationItem,
                    ...(verification.verified
                      ? styles.verificationItemVerified
                      : styles.verificationItemFailed),
                  }}
                >
                  <div style={styles.verificationHeader}>
                    <span style={styles.verificationIcon}>
                      {verification.verified ? '✅' : '❌'}
                    </span>
                    <div style={styles.verificationInfo}>
                      <p style={styles.verificationStatus}>
                        {verification.verified ? '인증 완료' : '인증 실패'}
                      </p>
                      <p style={styles.verificationDate}>
                        {new Date(verification.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  {verification.error && (
                    <p style={styles.verificationError}>오류: {verification.error}</p>
                  )}
                  {verification.faceData && (
                    <p style={styles.verificationData}>
                      신뢰도: {Math.round(verification.faceData.confidence * 100)}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 안내 섹션 */}
        <div style={styles.guideCard}>
          <h2 style={styles.cardTitle}>ℹ️ 사진 인증 가이드</h2>
          <ul style={styles.guideList}>
            <li>✓ 명확한 정면 사진 (얼굴이 80% 이상 보여야 함)</li>
            <li>✓ 자연광에서 촬영한 사진</li>
            <li>✓ 최근 6개월 이내의 사진</li>
            <li>✗ 필터나 가공이 심한 사진</li>
            <li>✗ 안경이나 모자로 얼굴 가린 사진</li>
            <li>✗ 여러 사람이 함께 있는 사진</li>
          </ul>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    paddingTop: '100px',
    paddingBottom: '90px',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  pageHeader: {
    marginBottom: '30px',
  },
  backLink: {
    color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    display: 'inline-block',
    marginBottom: '15px',
    transition: 'color 0.2s',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    marginBottom: '5px',
    margin: '0 0 5px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    margin: '0',
  },
  statusCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '25px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderLeft: '5px solid #ddd',
  },
  statusCardVerified: {
    borderLeftColor: '#28a745',
    background: 'rgba(40, 167, 69, 0.05)',
  },
  statusCardPending: {
    borderLeftColor: '#ffc107',
    background: 'rgba(255, 193, 7, 0.05)',
  },
  statusIcon: {
    fontSize: '48px',
    minWidth: '60px',
    textAlign: 'center',
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 5px 0',
  },
  statusDesc: {
    fontSize: '14px',
    color: '#666',
    margin: '0',
    lineHeight: '1.5',
  },
  errorCard: {
    background: 'rgba(220, 53, 69, 0.9)',
    color: 'white',
    padding: '15px 20px',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid rgba(220, 53, 69, 0.5)',
  },
  successCard: {
    background: 'rgba(40, 167, 69, 0.9)',
    color: 'white',
    padding: '15px 20px',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid rgba(40, 167, 69, 0.5)',
  },
  uploadCard: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    marginBottom: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '10px',
    margin: '0 0 10px 0',
  },
  cardSubtitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px',
  },
  uploadOptions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  uploadButton: {
    flex: 1,
    minWidth: '150px',
    padding: '14px 20px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  cameraSection: {
    marginBottom: '20px',
  },
  video: {
    width: '100%',
    maxWidth: '500px',
    maxHeight: '400px',
    borderRadius: '8px',
    background: '#000',
    margin: '0 auto 15px',
    display: 'block',
  },
  cameraButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  captureButton: {
    padding: '12px 30px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  uploadProgress: {
    textAlign: 'center',
    padding: '20px',
    background: '#e7f3ff',
    borderRadius: '8px',
    color: '#0066cc',
  },
  uploadHint: {
    fontSize: '12px',
    color: '#999',
    marginTop: '12px',
    fontStyle: 'italic',
  },
  historyCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  verificationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  verificationItem: {
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    background: '#f9f9f9',
  },
  verificationItemVerified: {
    background: 'rgba(40, 167, 69, 0.05)',
    borderColor: '#28a745',
  },
  verificationItemFailed: {
    background: 'rgba(220, 53, 69, 0.05)',
    borderColor: '#dc3545',
  },
  verificationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  verificationIcon: {
    fontSize: '20px',
    minWidth: '24px',
  },
  verificationInfo: {
    flex: 1,
  },
  verificationStatus: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 2px 0',
  },
  verificationDate: {
    fontSize: '12px',
    color: '#999',
    margin: '0',
  },
  verificationError: {
    fontSize: '13px',
    color: '#dc3545',
    marginTop: '8px',
    margin: '8px 0 0 36px',
  },
  verificationData: {
    fontSize: '13px',
    color: '#666',
    marginTop: '8px',
    margin: '8px 0 0 36px',
  },
  guideCard: {
    background: 'rgba(255,255,255,0.95)',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  guideList: {
    margin: '0',
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#333',
    lineHeight: '1.8',
  },
  loadingSpinner: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '20px',
    color: 'white',
  },
};
