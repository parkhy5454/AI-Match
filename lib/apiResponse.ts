import { NextResponse } from 'next/server';

/**
 * 표준화된 API 응답 형식
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 성공 응답
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * 에러 응답
 */
export function errorResponse(
  error: string,
  status: number = 400
) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

/**
 * 인증 에러
 */
export function unauthorizedResponse(message: string = '인증이 필요합니다') {
  return errorResponse(message, 401);
}

/**
 * 권한 없음 에러
 */
export function forbiddenResponse(message: string = '접근 권한이 없습니다') {
  return errorResponse(message, 403);
}

/**
 * 찾을 수 없음 에러
 */
export function notFoundResponse(message: string = '요청한 리소스를 찾을 수 없습니다') {
  return errorResponse(message, 404);
}

/**
 * 서버 에러
 */
export function serverErrorResponse(
  message: string = '서버 오류가 발생했습니다',
  error?: any
) {
  if (error) {
    console.error('[API Error]', error);
  }
  return errorResponse(message, 500);
}

/**
 * 유효성 검사 실패
 */
export function validationErrorResponse(message: string) {
  return errorResponse(message, 400);
}

/**
 * 속도 제한 초과
 */
export function rateLimitResponse(retryAfter: number) {
  return NextResponse.json(
    {
      success: false,
      error: '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.',
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
      },
    }
  );
}
