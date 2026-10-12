/**
 * 페이지네이션 유틸리티
 */

export interface PaginationParams {
  page?: number | string;
  limit?: number | string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * 페이지네이션 파라미터 파싱
 */
export function parsePaginationParams(params: PaginationParams): {
  skip: number;
  take: number;
} {
  const page = Math.max(1, parseInt(String(params.page || 1)));
  const limit = Math.min(100, Math.max(1, parseInt(String(params.limit || 20))));

  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

/**
 * 페이지네이션 메타 데이터 생성
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * 페이지네이션 응답 포맷
 */
export function formatPaginatedResponse<T>(
  data: T[],
  meta: PaginationMeta
) {
  return {
    success: true,
    data,
    meta,
  };
}
