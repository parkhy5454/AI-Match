/**
 * CORS (Cross-Origin Resource Sharing) 설정
 * API 서버와 클라이언트 간의 안전한 통신을 위한 정책
 */

export interface CorsOptions {
  origin?: string | string[] | RegExp | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  optionsSuccessStatus?: number;
}

/**
 * 환경별 허용된 오리진 목록
 */
function getAllowedOrigins(): string[] {
  const env = process.env.NODE_ENV || 'development';
  const customOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];

  const baseOrigins = {
    development: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ],
    staging: [
      'https://staging.ai-match.com',
      'https://www.staging.ai-match.com',
    ],
    production: [
      'https://ai-match.com',
      'https://www.ai-match.com',
    ],
  };

  const origins = baseOrigins[env as keyof typeof baseOrigins] || baseOrigins.production;
  return [...origins, ...customOrigins].filter(Boolean);
}

/**
 * 오리진 검증 함수
 */
function validateOrigin(origin: string | undefined): boolean {
  if (!origin) {
    // 오리진 없는 요청 (예: 같은 사이트, 앱)은 허용
    return true;
  }

  const allowedOrigins = getAllowedOrigins();

  // 정확한 매치
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // 정규식 매치 (예: *.ai-match.com)
  const isAllowed = allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin.includes('*')) {
      const regex = new RegExp(
        `^${allowedOrigin.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`
      );
      return regex.test(origin);
    }
    return false;
  });

  return isAllowed;
}

/**
 * 기본 CORS 옵션
 */
export const defaultCorsOptions: CorsOptions = {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  credentials: true, // 쿠키 포함 허용
  maxAge: 86400, // 24시간
  optionsSuccessStatus: 200,
};

/**
 * CORS 헤더 생성
 */
export function getCorsHeaders(origin?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
    'Access-Control-Max-Age': '86400',
  };

  // 오리진 검증
  if (validateOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin || '*';
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    // 허용되지 않은 오리진은 응답 헤더에 포함하지 않음
    console.warn(`[CORS] 허용되지 않은 오리진: ${origin}`);
  }

  return headers;
}

/**
 * 보안 헤더 (HSTS, CSP 등)
 */
export function getSecurityHeaders(): Record<string, string> {
  const env = process.env.NODE_ENV || 'development';

  return {
    // HTTPS 강제 (Strict-Transport-Security)
    'Strict-Transport-Security':
      env === 'production'
        ? 'max-age=31536000; includeSubDomains; preload'
        : 'max-age=3600; includeSubDomains',

    // X-Frame-Options: 클릭재킹 공격 방지
    'X-Frame-Options': 'DENY',

    // X-Content-Type-Options: MIME 타입 스니핑 방지
    'X-Content-Type-Options': 'nosniff',

    // X-XSS-Protection: XSS 공격 방지
    'X-XSS-Protection': '1; mode=block',

    // Referrer-Policy: 참조자 정보 제어
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions-Policy: 특정 기능 권한 제한
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',

    // Content Security Policy: XSS 및 인젝션 공격 방지
    'Content-Security-Policy':
      env === 'production'
        ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:;"
        : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:;",
  };
}

/**
 * CORS OPTIONS 요청 처리
 */
export function handleCorsPreFlight(origin?: string): Response {
  const headers = {
    ...getCorsHeaders(origin),
    ...getSecurityHeaders(),
  };

  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * API 응답에 CORS 헤더 추가
 */
export function addCorsHeaders(
  response: Response,
  origin?: string
): Response {
  const headers = new Headers(response.headers);
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();

  // CORS 헤더 추가
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // 보안 헤더 추가
  Object.entries(securityHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * 허용되지 않은 오리진 응답
 */
export function handleCorsError(origin?: string): Response {
  console.error(`[CORS] CORS 정책 위반: ${origin}`);

  return new Response(
    JSON.stringify({
      error: 'CORS policy violation',
      message: 'The origin is not allowed to access this resource',
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        ...getSecurityHeaders(),
      },
    }
  );
}

/**
 * HTTPS 리다이렉트 확인
 */
export function shouldEnforceHttps(): boolean {
  return process.env.NODE_ENV === 'production' &&
         process.env.ENFORCE_HTTPS !== 'false';
}

/**
 * HTTPS 리다이렉트 응답
 */
export function handleHttpsRedirect(url: string): Response {
  try {
    const urlObj = new URL(url);
    urlObj.protocol = 'https:';

    return new Response(null, {
      status: 301,
      headers: {
        Location: urlObj.toString(),
      },
    });
  } catch (error) {
    console.error('[HTTPS Redirect] URL 파싱 오류:', error);
    return new Response('Bad Request', { status: 400 });
  }
}
