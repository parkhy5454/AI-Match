'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function PremiumPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);

  const plans = [
    {
      id: 'basic',
      name: '기본',
      price: 9900,
      duration: '30일',
      features: [
        '무제한 프로필 조회',
        '하루 50회 좋아요',
        '매칭 알림',
        '메시지 전송',
      ],
      badge: null,
    },
    {
      id: 'premium',
      name: '프리미엄',
      price: 29900,
      duration: '30일',
      features: [
        '모든 기본 기능',
        '무제한 좋아요',
        '프로필 숨김 해제',
        '우선 매칭',
        '프로필 부스트 1회/주',
        '프리미엄 배지',
      ],
      badge: '👑 프리미엄',
      popular: true,
    },
    {
      id: 'vip',
      name: 'VIP',
      price: 59900,
      duration: '30일',
      features: [
        '모든 프리미엄 기능',
        '최우선 매칭',
        '프로필 부스트 무제한',
        '방문자 목록 확인',
        'VIP 고객 지원',
        '매월 특별 선물',
        'VIP 배지',
      ],
      badge: '⭐ VIP',
    },
  ];

  useEffect(() => {
    if (!hydrated) return;
    fetchSubscription();
  }, [hydrated]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `/api/subscriptions/my-subscription`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSubscription(response.data.data);
      }
    } catch (err) {
      console.error('구독 정보 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    try {
      setProcessing(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `/api/subscriptions`,
        { planId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSubscription(response.data.data);
        alert('구독이 완료되었습니다!');
        setSelectedPlan(null);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || '구독 업그레이드에 실패했습니다';
      setError(errorMsg);
    } finally {
      setProcessing(false);
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

  const currentPlan = subscription?.planId;
  const expiresAt = subscription?.expiresAt;

  return (
    <>
      <TopNav />
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <Link href="/dashboard" style={styles.backLink}>
            ← 뒤로 가기
          </Link>
          <h1 style={styles.title}>👑 프리미엄</h1>
          <p style={styles.subtitle}>멤버십을 업그레이드하세요</p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* 현재 구독 상태 */}
        {subscription && (
          <div style={styles.currentPlanCard}>
            <h2 style={styles.currentPlanTitle}>현재 구독</h2>
            <p style={styles.currentPlanName}>
              {plans.find(p => p.id === currentPlan)?.name || '무료'}
            </p>
            {expiresAt && (
              <p style={styles.currentPlanExpiry}>
                만료 예정: {new Date(expiresAt).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>
        )}

        {/* 요금제 */}
        <div style={styles.plansSection}>
          <h2 style={styles.sectionTitle}>💳 요금제</h2>
          <div style={styles.plansGrid}>
            {plans.map((plan) => (
              <div
                key={plan.id}
                style={{
                  ...styles.planCard,
                  border: plan.popular ? '2px solid #667eea' : '1px solid #ddd',
                  boxShadow: plan.popular ? '0 8px 16px rgba(102,126,234,0.2)' : '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                {plan.popular && (
                  <div style={styles.popularBadge}>인기</div>
                )}

                <h3 style={styles.planName}>{plan.name}</h3>
                <p style={styles.planPrice}>
                  ₩{plan.price.toLocaleString()}
                  <span style={styles.planDuration}>/{plan.duration}</span>
                </p>

                {plan.badge && (
                  <p style={styles.planBadge}>{plan.badge}</p>
                )}

                <ul style={styles.featuresList}>
                  {plan.features.map((feature, idx) => (
                    <li key={idx} style={styles.featureItem}>
                      <span style={styles.checkmark}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={processing || currentPlan === plan.id}
                  style={{
                    ...styles.upgradeButton,
                    background: currentPlan === plan.id ? '#ddd' : '#667eea',
                    opacity: processing ? 0.6 : 1,
                  }}
                >
                  {processing ? '처리 중...' : currentPlan === plan.id ? '현재 플랜' : '선택'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 프리미엄 혜택 */}
        <div style={styles.benefitsSection}>
          <h2 style={styles.sectionTitle}>✨ 프리미엄 혜택</h2>
          <div style={styles.benefitsGrid}>
            <div style={styles.benefitCard}>
              <span style={styles.benefitIcon}>💖</span>
              <h4 style={styles.benefitName}>무제한 좋아요</h4>
              <p style={styles.benefitDesc}>마음에 드는 사람에게 제약 없이 좋아요를 보내세요</p>
            </div>

            <div style={styles.benefitCard}>
              <span style={styles.benefitIcon}>⚡</span>
              <h4 style={styles.benefitName}>우선 매칭</h4>
              <p style={styles.benefitDesc}>일반 회원보다 더 빨리 매칭됩니다</p>
            </div>

            <div style={styles.benefitCard}>
              <span style={styles.benefitIcon}>👁️</span>
              <h4 style={styles.benefitName}>방문자 목록</h4>
              <p style={styles.benefitDesc}>누가 당신의 프로필을 봤는지 확인하세요</p>
            </div>

            <div style={styles.benefitCard}>
              <span style={styles.benefitIcon}>🚀</span>
              <h4 style={styles.benefitName}>프로필 부스트</h4>
              <p style={styles.benefitDesc}>프로필 노출을 높여 더 많은 만남을 만들어보세요</p>
            </div>

            <div style={styles.benefitCard}>
              <span style={styles.benefitIcon}>🎁</span>
              <h4 style={styles.benefitName}>월별 선물</h4>
              <p style={styles.benefitDesc}>매월 특별한 보상과 혜택을 받으세요</p>
            </div>

            <div style={styles.benefitCard}>
              <span style={styles.benefitIcon}>🎯</span>
              <h4 style={styles.benefitName}>맞춤형 추천</h4>
              <p style={styles.benefitDesc}>AI가 당신에게 딱 맞는 사람을 추천해드립니다</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div style={styles.faqSection}>
          <h2 style={styles.sectionTitle}>❓ 자주 묻는 질문</h2>
          <div style={styles.faqGrid}>
            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>구독을 취소할 수 있나요?</h4>
              <p style={styles.faqAnswer}>네, 언제든지 구독을 취소할 수 있습니다. 다음 갱신 날까지 프리미엄 혜택을 이용하실 수 있습니다.</p>
            </div>

            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>환불이 가능한가요?</h4>
              <p style={styles.faqAnswer}>구독 후 7일 이내 전액 환불이 가능합니다. 지원팀에 문의하세요.</p>
            </div>

            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>자동 갱신이 되나요?</h4>
              <p style={styles.faqAnswer}>네, 구독은 자동으로 갱신됩니다. 설정에서 언제든지 자동 갱신을 취소할 수 있습니다.</p>
            </div>

            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>플랜 변경이 가능한가요?</h4>
              <p style={styles.faqAnswer}>네, 언제든지 다른 플랜으로 변경할 수 있습니다. 새 플랜은 즉시 적용됩니다.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '1000px',
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
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    margin: '0 0 5px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    margin: '0',
  },
  errorCard: {
    background: 'rgba(220, 53, 69, 0.9)',
    color: 'white',
    padding: '15px 20px',
    borderRadius: '12px',
    marginBottom: '25px',
  },
  currentPlanCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  currentPlanTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#999',
    margin: '0 0 10px 0',
    textTransform: 'uppercase',
  },
  currentPlanName: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '0',
  },
  currentPlanExpiry: {
    fontSize: '13px',
    color: '#666',
    margin: '8px 0 0 0',
  },
  plansSection: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
    marginBottom: '20px',
    textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
  },
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  planCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: '#667eea',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
  },
  planName: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 10px 0',
  },
  planPrice: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#667eea',
    margin: '0 0 5px 0',
  },
  planDuration: {
    fontSize: '14px',
    color: '#999',
    fontWeight: '400',
  },
  planBadge: {
    fontSize: '16px',
    margin: '10px 0',
  },
  featuresList: {
    listStyle: 'none',
    padding: '0',
    margin: '20px 0',
  },
  featureItem: {
    fontSize: '14px',
    color: '#333',
    margin: '10px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  checkmark: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  upgradeButton: {
    width: '100%',
    padding: '12px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  benefitsSection: {
    marginBottom: '40px',
  },
  benefitsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
  },
  benefitCard: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center',
    color: 'white',
  },
  benefitIcon: {
    fontSize: '28px',
    display: 'block',
    marginBottom: '10px',
  },
  benefitName: {
    fontSize: '15px',
    fontWeight: '700',
    margin: '0 0 8px 0',
  },
  benefitDesc: {
    fontSize: '13px',
    margin: '0',
    color: 'rgba(255,255,255,0.8)',
  },
  faqSection: {
    marginBottom: '30px',
  },
  faqGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  faqItem: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  faqQuestion: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 10px 0',
  },
  faqAnswer: {
    fontSize: '13px',
    color: '#666',
    margin: '0',
    lineHeight: '1.5',
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
