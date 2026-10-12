import { NextRequest, NextResponse } from 'next/server';
import logger, { logApiRequest, logApiError } from '@/app/lib/logger';

export function loggingMiddleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname, search } = request.nextUrl;

  try {
    const response = NextResponse.next();
    const duration = Date.now() - startTime;

    logApiRequest(
      request.method,
      `${pathname}${search}`,
      response.status,
      duration,
      request.headers.get('x-user-id') || undefined
    );

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logApiError(
      request.method,
      `${pathname}${search}`,
      error instanceof Error ? error : new Error(String(error)),
      request.headers.get('x-user-id')
    );
    throw error;
  }
}
