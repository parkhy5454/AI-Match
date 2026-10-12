'use client';

import Link from "next/link";

export default function NotFound() {
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
          color: "#ff6b6b",
          margin: "0 0 20px 0",
        }}>
          404
        </div>
        
        <h1 style={{
          fontSize: "32px",
          fontWeight: "bold",
          margin: "0 0 10px 0",
          color: "#333",
        }}>
          페이지를 찾을 수 없습니다
        </h1>
        
        <p style={{
          fontSize: "16px",
          color: "#666",
          margin: "0 0 30px 0",
          lineHeight: "1.6",
        }}>
          죄송합니다. 요청하신 페이지를 찾을 수 없습니다.
          주소가 올바른지 확인해주세요.
        </p>

        <div style={{
          display: "flex",
          gap: "10px",
          justifyContent: "center",
        }}>
          <Link href="/" style={{
            backgroundColor: "#ff6b6b",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
            transition: "background-color 0.3s",
          }} onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "#ff5252";
          }} onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "#ff6b6b";
          }}>
            홈으로 돌아가기
          </Link>
          
          <button onClick={() => window.history.back()} style={{
            backgroundColor: "#e0e0e0",
            color: "#333",
            padding: "12px 24px",
            borderRadius: "8px",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "background-color 0.3s",
          }} onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "#d0d0d0";
          }} onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "#e0e0e0";
          }}>
            이전 페이지
          </button>
        </div>

        <div style={{
          marginTop: "40px",
          padding: "20px",
          backgroundColor: "white",
          borderRadius: "8px",
          borderLeft: "4px solid #ff6b6b",
        }}>
          <p style={{
            fontSize: "14px",
            color: "#666",
            margin: 0,
          }}>
            <strong>도움이 필요하신가요?</strong><br />
            문제가 계속되면 지원팀에 연락해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
