/**
 * API 에러 처리 유틸리티
 */

export class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * 인증 에러 (401)
 */
export class AuthenticationError extends APIError {
  constructor(message: string = "인증이 필요합니다") {
    super(401, message, "AUTHENTICATION_ERROR");
  }
}

/**
 * 권한 에러 (403)
 */
export class AuthorizationError extends APIError {
  constructor(message: string = "권한이 없습니다") {
    super(403, message, "AUTHORIZATION_ERROR");
  }
}

/**
 * 찾을 수 없음 에러 (404)
 */
export class NotFoundError extends APIError {
  constructor(resource: string = "리소스") {
    super(404, `${resource}를 찾을 수 없습니다`, "NOT_FOUND");
  }
}

/**
 * 유효성 검사 에러 (400)
 */
export class ValidationError extends APIError {
  constructor(message: string) {
    super(400, message, "VALIDATION_ERROR");
  }
}

/**
 * 충돌 에러 (409)
 */
export class ConflictError extends APIError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
  }
}

/**
 * Rate Limit 에러 (429)
 */
export class RateLimitError extends APIError {
  constructor(
    public retryAfter: number = 60
  ) {
    super(429, "너무 많은 요청을 보냈습니다", "RATE_LIMIT_EXCEEDED");
  }
}

/**
 * 서버 에러 (500)
 */
export class ServerError extends APIError {
  constructor(message: string = "서버에 오류가 발생했습니다") {
    super(500, message, "INTERNAL_SERVER_ERROR");
  }
}

/**
 * 에러 응답 포맷
 */
export function formatErrorResponse(error: Error | APIError) {
  if (error instanceof APIError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  return {
    success: false,
    error: "서버에 오류가 발생했습니다",
    code: "INTERNAL_SERVER_ERROR",
    statusCode: 500,
  };
}

/**
 * 안전한 에러 메시지
 * 외부에 노출되지 않아야 할 정보를 숨김
 */
export function getSafeErrorMessage(error: any): string {
  if (error instanceof APIError) {
    return error.message;
  }

  if (error instanceof TypeError) {
    return "요청 데이터 형식이 잘못되었습니다";
  }

  if (error instanceof SyntaxError) {
    return "요청 데이터를 파싱할 수 없습니다";
  }

  return "서버에 오류가 발생했습니다";
}

/**
 * Prisma 에러 처리
 */
export function handlePrismaError(error: any): APIError {
  // Unique constraint 위반
  if (error.code === "P2002") {
    const field = error.meta?.target?.[0] || "필드";
    return new ConflictError(`${field}은(는) 이미 사용 중입니다`);
  }

  // 레코드를 찾을 수 없음
  if (error.code === "P2025") {
    return new NotFoundError("레코드");
  }

  // 관계 제약 조건 위반
  if (error.code === "P2003") {
    return new ValidationError("관련된 데이터가 존재하지 않습니다");
  }

  // 기타 Prisma 에러
  console.error("[Prisma Error]", error);
  return new ServerError();
}
