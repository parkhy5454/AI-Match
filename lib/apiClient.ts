import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * API 클라이언트 설정
 * - AccessToken 자동 첨부
 * - RefreshToken 기반 자동 재발급
 * - 에러 처리
 *
 * 변경사항:
 * - localStorage와 메모리 변수 동기화
 * - 모든 페이지에서 일관된 토큰 키 사용 (accessToken, refreshToken)
 * - 토큰 설정 시 null 체크로 안전성 강화
 */

let accessToken = '';
let refreshToken = '';

/**
 * 토큰을 메모리와 localStorage에 동시에 저장
 * AuthContext와 apiClient 간의 동기화
 *
 * 이유: 다른 탭에서 토큰이 변경되어도 메모리에서 읽을 수 있도록
 */
export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;

  // 클라이언트 환경에서만 localStorage 사용
  if (typeof window !== 'undefined') {
    if (access) {
      localStorage.setItem('accessToken', access);
    } else {
      localStorage.removeItem('accessToken');
    }

    if (refresh) {
      localStorage.setItem('refreshToken', refresh);
    } else {
      localStorage.removeItem('refreshToken');
    }

    console.log('[apiClient] 토큰 저장됨:', { hasAccess: !!access, hasRefresh: !!refresh });
  }
};

/**
 * 저장된 토큰 가져오기 (메모리에서)
 */
export const getTokens = () => {
  return { accessToken, refreshToken };
};

/**
 * 토큰 초기화 (로그아웃)
 */
export const clearTokens = () => {
  accessToken = '';
  refreshToken = '';

  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    console.log('[apiClient] 토큰 초기화됨');
  }
};

/**
 * 클라이언트 환경에서 localStorage에서 토큰 로드
 * 페이지 새로고침 또는 새 탭 오픈 시 호출되어야 함
 *
 * 이유: 앱 초기 로드 시 이전 세션의 토큰을 메모리에 복원
 */
export const loadTokensFromStorage = () => {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem('accessToken');
    const refreshStored = localStorage.getItem('refreshToken');

    if (stored) {
      accessToken = stored;
      console.log('[apiClient] accessToken localStorage에서 로드됨');
    }
    if (refreshStored) {
      refreshToken = refreshStored;
      console.log('[apiClient] refreshToken localStorage에서 로드됨');
    }
  } catch (error) {
    console.error('[apiClient] localStorage 접근 에러:', error);
  }
};

/**
 * 토큰이 설정되어 있는지 확인
 */
export const hasTokens = () => {
  return !!accessToken && !!refreshToken;
};

// Axios 인스턴스 생성
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: '/',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 요청 인터셉터: AccessToken 자동 첨부
  client.interceptors.request.use(
    (config) => {
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 응답 인터셉터: 401 에러 시 토큰 갱신
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config;

      // 401 에러이고 아직 재시도하지 않았으면
      if (error.response?.status === 401 && originalRequest && !originalRequest.headers['X-Retry']) {
        try {
          // 토큰 갱신 API 호출
          const response = await axios.post('/api/auth/refresh', {
            refreshToken,
          });

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            response.data.data;

          // 새 토큰 저장
          setTokens(newAccessToken, newRefreshToken);

          // 원본 요청 재시도
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers['X-Retry'] = 'true';
          return client(originalRequest);
        } catch (refreshError) {
          // 토큰 갱신 실패 → 로그인 페이지로 리디렉트
          clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

export const apiClient = createApiClient();

export default apiClient;
