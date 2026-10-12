'use client';

import { useEffect, useState } from 'react';

export default function MaintenancePage() {
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [retryCountdown, setRetryCountdown] = useState<number>(0);

  useEffect(() => {
    // 유지보수 예상 시간 (예: 1시간)
    const maintenanceEnd = new Date(Date.now() + 60 * 60 * 1000);
    const now = new Date();
    const diffMs = maintenanceEnd.getTime() - now.getTime();
    const diffMins = Math.ceil(diffMs / (1000 * 60));

    setEstimatedTime(`약 ${diffMins}분`);

    // 자동 재시도 타이머
    const retryTimer = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 5분 후 자동 새로고침 시도
    const timer = setTimeout(() => {
      setRetryCountdown(60); // 60초 카운트다운 시작
    }, 5 * 60 * 1000);

    // 에러 로깅
    if (typeof window !== 'undefined' && window.__SENTRY__) {
      window.__SENTRY__.captureMessage('Maintenance mode active (503)', 'info', {
        tags: {
          page: 'maintenance',
          errorCode: '503',
        },
      });
    }

    return () => {
      clearInterval(retryTimer);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '20px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        {/* 에러 코드 */}
        <div
          style={{
            fontSize: '120px',
            fontWeight: 'bold',
            color: '#748ffc',
            margin: '0 0 20px 0',
          }}
        >
          503
        </div>

        {/* 제목 */}
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 'bold',
            margin: '0 0 10px 0',
            color: '#333',
          }}
        >
          점검 중입니다
        </h1>

        {/* 설명 */}
        <p
          style={{
            fontSize: '16px',
            color: '#666',
            margin: '0 0 30px 0',
            lineHeight: '1.6',
          }}
        >
          현재 서버 점검 중입니다.
          <br />
          {estimatedTime && <>곧 복구될 예정입니다. ({estimatedTime})</>}
        </p>

        {/* 점검 정보 */}
        <div
          style={{
            backgroundColor: '#e7f5ff',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '30px',
            textAlign: 'left',
            borderLeft: '4px solid #748ffc',
          }}
        >
          <p
            style={{
              fontSize: '14px',
              color: '#1864ab',
              margin: '0 0 10px 0',
              fontWeight: 'bold',
            }}
          >
            점검 안내:
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: '20px',
              fontSize: '14px',
              color: '#1864ab',
            }}
          >
            <li>긴급 업데이트를 진행 중입니다</li>
            <li>서버 성능 최적화를 수행합니다</li>
            <li>보안 업데이트를 적용합니다</li>
          </ul>
        </div>

        {/* 액션 버튼 */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '30px',
          }}
        >
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#748ffc',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.3s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#5c7cfa';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#748ffc';
            }}
          >
            새로고침
          </button>

          <a
            href="https://twitter.com/ai_match"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: '#e0e0e0',
              color: '#333',
              padding: '12px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
              transition: 'background-color 0.3s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#d0d0d0';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#e0e0e0';
            }}
          >
            상태 확인
          </a>
        </div>

        {/* 자동 재시도 정보 */}
        {retryCountdown > 0 && (
          <div
            style={{
              backgroundColor: '#fff3bf',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '30px',
              borderLeft: '4px solid #fab005',
            }}
          >
            <p
              style={{
                fontSize: '14px',
                color: '#7c6e0e',
                margin: 0,
              }}
            >
              {retryCountdown}초 후 자동으로 새로고침됩니다...
            </p>
          </div>
        )}

        {/* 지원 정보 */}
        <div
          style={{
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            borderLeft: '4px solid #748ffc',
          }}
        >
          <p
            style={{
              fontSize: '14px',
              color: '#666',
              margin: 0,
              lineHeight: '1.6',
            }}
          >
            <strong>문제가 지속되나요?</strong>
            <br />
            지원팀에 문의해주세요.
            <br />
            <a
              href="mailto:support@ai-match.com"
              style={{
                color: '#748ffc',
                textDecoration: 'none',
              }}
            >
              support@ai-match.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
