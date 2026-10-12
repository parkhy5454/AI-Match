'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { setTokens as setApiTokens, clearTokens as clearApiTokens, loadTokensFromStorage as loadApiTokens } from '@/lib/apiClient';

interface AuthContextType {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (access: string | null, refresh?: string | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
  hydrated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * 인증 상태를 관리하는 Provider
 *
 * 변경사항:
 * - AuthContext와 apiClient 토큰 동기화
 * - localStorage와 메모리 변수 일관성 유지
 * - isAuthenticated는 state에서만 읽기 (storage 접근 제거)
 * - 다른 탭에서의 토큰 변경 감지 (storage 이벤트)
 * - 구 토큰 키(token) 마이그레이션 제거
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // 페이지 로드 시 localStorage에서 토큰 복구
  useEffect(() => {
    // 클라이언트 환경인지 확인 (SSR 대응)
    if (typeof window === 'undefined') {
      setHydrated(true);
      return;
    }

    try {
      // 새 키 확인 (accessToken, refreshToken)
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (storedAccessToken) {
        setAccessTokenState(storedAccessToken);
        console.log('[AuthContext] accessToken localStorage에서 복구됨');
      }
      if (storedRefreshToken) {
        setRefreshTokenState(storedRefreshToken);
        console.log('[AuthContext] refreshToken localStorage에서 복구됨');
      }

      // apiClient에도 로드
      loadApiTokens();
    } catch (error) {
      console.error('[AuthContext] 초기화 에러:', error);
    } finally {
      setHydrated(true);
    }
  }, []);

  // 다른 탭에서의 토큰 변경 감지 (storage 이벤트)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken') {
        if (e.newValue) {
          setAccessTokenState(e.newValue);
          console.log('[AuthContext] 다른 탭에서 accessToken 변경됨');
        } else {
          setAccessTokenState(null);
          console.log('[AuthContext] 다른 탭에서 accessToken 삭제됨');
        }
      }
      if (e.key === 'refreshToken') {
        if (e.newValue) {
          setRefreshTokenState(e.newValue);
          console.log('[AuthContext] 다른 탭에서 refreshToken 변경됨');
        } else {
          setRefreshTokenState(null);
          console.log('[AuthContext] 다른 탭에서 refreshToken 삭제됨');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * AuthContext와 apiClient 모두에 토큰 저장
   *
   * 이유:
   * 1. AuthContext: React 컴포넌트에서 인증 상태 확인 용
   * 2. apiClient: Axios 요청에 자동 첨부 용
   * 3. localStorage: 페이지 새로고침 시 토큰 복원 용
   */
  const setTokens = (newAccessToken: string | null, newRefreshToken?: string | null) => {
    // AuthContext 상태 업데이트
    setAccessTokenState(newAccessToken);
    if (newRefreshToken !== undefined) {
      setRefreshTokenState(newRefreshToken);
    }

    // 클라이언트 환경에서만 처리
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // localStorage에 저장
      if (newAccessToken) {
        localStorage.setItem('accessToken', newAccessToken);
        console.log('[AuthContext] accessToken 저장됨');
      } else {
        localStorage.removeItem('accessToken');
        console.log('[AuthContext] accessToken 삭제됨');
      }

      const finalRefreshToken = newRefreshToken !== undefined ? newRefreshToken : refreshToken;
      if (finalRefreshToken) {
        localStorage.setItem('refreshToken', finalRefreshToken);
        console.log('[AuthContext] refreshToken 저장됨');
      } else {
        localStorage.removeItem('refreshToken');
        console.log('[AuthContext] refreshToken 삭제됨');
      }

      // apiClient에 동일한 토큰 설정
      if (newAccessToken && finalRefreshToken) {
        setApiTokens(newAccessToken, finalRefreshToken);
      } else {
        clearApiTokens();
      }
    } catch (error) {
      console.error('[AuthContext] 토큰 저장 에러:', error);
    }
  };

  const logout = () => {
    setAccessTokenState(null);
    setRefreshTokenState(null);
    clearApiTokens();

    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }

    console.log('[AuthContext] 로그아웃됨');
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        setTokens,
        // isAuthenticated는 state에서만 읽기 (storage 접근 제거)
        isAuthenticated: !!accessToken && !!refreshToken,
        logout,
        hydrated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
