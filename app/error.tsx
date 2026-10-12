'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { captureException, addBreadcrumb } from "@/sentry.client.config";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 에러 로깅
    console.error("[Error Page] Error caught by error.tsx:", error);

    // 에러에 대한 Breadcrumb 추가
    addBreadcrumb(
      `Error boundary caught: ${error.message}`,
      'error-boundary',
      'error',
      { digest: error.digest, stack: error.stack }
    );

    // Sentry로 에러 전송
    captureException(error, {
      tags: {
        page: 'error-boundary',
        errorType: 'unhandled',
      },
      contexts: {
        react: {
          componentStack: error.stack,
          digest: error.digest,
        },
      },
    });

    // 커스텀 에러 리포팅 API
    try {
      fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: error.message,
          digest: error.digest,
          stack: error.stack,
          url: typeof window !== 'undefined' ? window.location.href : 'unknown',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          timestamp: new Date().toISOString(),
        }),
      }).catch(err => console.error('[Error Report API] Failed:', err));
    } catch (reportError) {
      console.error('[Error Reporting] Failed to report error:', reportError);
    }
  }, [error]);

  const isServerError = error.message?.includes("500") || !error.message;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      backgroundColor: "#f5f5f5",
      padding: "20px",
    }}>
      <div style={{
        textAlign: "center",
        maxWidth: "500px",
      }}>
        <div style={{
          fontSize: "120px",
          fontWeight: "bold",
          color: "#fa5252",
          margin: "0 0 20px 0",
        }}>
          {isServerError ? "500" : "오류"}
        </div>
        
        <h1 style={{
          fontSize: "32px",
          fontWeight: "bold",
          margin: "0 0 10px 0",
          color: "#333",
        }}>
          {isServerError ? "서버 오류가 발생했습니다" : "오류가 발생했습니다"}
        </h1>
        
        <p style={{
          fontSize: "16px",
          color: "#666",
          margin: "0 0 30px 0",
          lineHeight: "1.6",
        }}>
          {isServerError 
            ? "요청을 처리하는 중에 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
            : "예상치 못한 오류가 발생했습니다."}
        </p>

        {error.message && (
          <div style={{
            backgroundColor: "#fff3cd",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
            textAlign: "left",
            borderLeft: "4px solid #ffc107",
          }}>
            <p style={{
              fontSize: "14px",
              color: "#856404",
              margin: 0,
              wordBreak: "break-word",
            }}>
              <strong>오류 세부사항:</strong> {error.message}
            </p>
          </div>
        )}

        <div style={{
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          flexWrap: "wrap",
        }}>
          <button onClick={() => reset()} style={{
            backgroundColor: "#fa5252",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "background-color 0.3s",
          }} onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "#f03e3e";
          }} onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "#fa5252";
          }}>
            다시 시도
          </button>
          
          <Link href="/" style={{
            backgroundColor: "#e0e0e0",
            color: "#333",
            padding: "12px 24px",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
            transition: "background-color 0.3s",
          }} onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "#d0d0d0";
          }} onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "#e0e0e0";
          }}>
            홈으로 돌아가기
          </Link>
        </div>

        <div style={{
          marginTop: "40px",
          padding: "20px",
          backgroundColor: "white",
          borderRadius: "8px",
          borderLeft: "4px solid #fa5252",
        }}>
          <p style={{
            fontSize: "14px",
            color: "#666",
            margin: 0,
            lineHeight: "1.6",
          }}>
            <strong>문제가 계속되나요?</strong><br />
            지원팀에 문의해주세요:<br />
            <a href="mailto:support@ai-match.com" style={{
              color: "#fa5252",
              textDecoration: "none",
            }}>support@ai-match.com</a>
          </p>
        </div>

        {error.digest && (
          <p style={{
            fontSize: "12px",
            color: "#999",
            margin: "20px 0 0 0",
          }}>
            에러 ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
