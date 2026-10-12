'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ForbiddenPage() {
  useEffect(() => {
    console.warn('[Forbidden] Access denied to resource');

    // 에러 로깅
    if (typeof window !== 'undefined' && window.__SENTRY__) {
      window.__SENTRY__.captureMessage('Access denied (403)', 'warning', {
        tags: {
          page: 'forbidden',
          errorCode: '403',
        },
      });
    }
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
            color: '#ffa94d',
            margin: '0 0 20px 0',
          }}
        >
          403
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
          접근 거부됨
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
          죄송합니다. 이 리소스에 접근할 권한이 없습니다.
          <br />
          필요한 권한이 있으신지 확인해주세요.
        </p>

        {/* 가능한 원인 */}
        <div
          style={{
            backgroundColor: '#fff3cd',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '30px',
            textAlign: 'left',
            borderLeft: '4px solid #ffa94d',
          }}
        >
          <p
            style={{
              fontSize: '14px',
              color: '#856404',
              margin: '0 0 10px 0',
              fontWeight: 'bold',
            }}
          >
            가능한 원인:
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: '20px',
              fontSize: '14px',
              color: '#856404',
            }}
          >
            <li>계정에 필요한 권한이 없습니다</li>
            <li>요청이 관리자만 접근 가능한 영역입니다</li>
            <li>구독 상태가 만료되었을 수 있습니다</li>
          </ul>
        </div>

        {/* 액션 버튼 */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/"
            style={{
              backgroundColor: '#ffa94d',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
              transition: 'background-color 0.3s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#ff922b';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#ffa94d';
            }}
          >
            홈으로 돌아가기
          </Link>

          <button
            onClick={() => window.history.back()}
            style={{
              backgroundColor: '#e0e0e0',
              color: '#333',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.3s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#d0d0d0';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#e0e0e0';
            }}
          >
            이전 페이지
          </button>
        </div>

        {/* 지원 정보 */}
        <div
          style={{
            marginTop: '40px',
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            borderLeft: '4px solid #ffa94d',
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
            <strong>도움이 필요하신가요?</strong>
            <br />
            권한 문제가 계속되면 지원팀에 연락해주세요.
            <br />
            <a
              href="mailto:support@ai-match.com"
              style={{
                color: '#ffa94d',
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
