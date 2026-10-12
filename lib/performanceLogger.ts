/**
 * 성능 로깅 유틸리티
 * API 응답 시간, 성능 메트릭 추적
 */

interface PerformanceMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number; // 밀리초
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
}

// 메모리 저장소 (프로덕션에서는 DB나 로깅 서비스 사용)
const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 10000; // 최대 저장 수

/**
 * 성능 메트릭 기록
 */
export function logPerformanceMetric(metric: PerformanceMetric) {
  metrics.push(metric);
  
  // 최대 수를 초과하면 오래된 항목 삭제
  if (metrics.length > MAX_METRICS) {
    metrics.splice(0, Math.floor(MAX_METRICS / 10));
  }

  // 느린 요청 로깅 (1초 이상)
  if (metric.responseTime > 1000) {
    console.warn(
      `[SLOW REQUEST] ${metric.method} ${metric.endpoint} - ${metric.responseTime}ms (${metric.statusCode})`
    );
  }

  // 에러 요청 로깅
  if (metric.statusCode >= 400) {
    console.error(
      `[ERROR REQUEST] ${metric.method} ${metric.endpoint} - ${metric.statusCode} (${metric.responseTime}ms)`
    );
  }
}

/**
 * 엔드포인트별 성능 통계 조회
 */
export function getEndpointStats(endpoint?: string) {
  const filtered = endpoint ? metrics.filter(m => m.endpoint === endpoint) : metrics;
  
  if (filtered.length === 0) {
    return null;
  }

  const responseTimes = filtered.map(m => m.responseTime);
  const sorted = responseTimes.sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const median = sorted[Math.floor(sorted.length / 2)];

  const successCount = filtered.filter(m => m.statusCode < 400).length;
  const errorCount = filtered.filter(m => m.statusCode >= 400).length;

  return {
    endpoint,
    totalRequests: filtered.length,
    successCount,
    errorCount,
    successRate: ((successCount / filtered.length) * 100).toFixed(2) + "%",
    responseTime: {
      min,
      max,
      avg: Math.round(avg),
      median,
    },
  };
}

/**
 * 모든 엔드포인트의 통계 조회
 */
export function getAllEndpointStats() {
  const endpoints = new Set(metrics.map(m => m.endpoint));
  const stats = Array.from(endpoints).map(endpoint => getEndpointStats(endpoint));
  
  return stats.filter(Boolean).sort((a, b) => {
    // 가장 느린 엔드포인트순으로 정렬
    return b!.responseTime.avg - a!.responseTime.avg;
  });
}

/**
 * 메서드별 통계 조회
 */
export function getMethodStats(method?: string) {
  const filtered = method ? metrics.filter(m => m.method === method) : metrics;
  
  if (filtered.length === 0) return null;

  const responseTimes = filtered.map(m => m.responseTime);
  const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

  return {
    method,
    totalRequests: filtered.length,
    avgResponseTime: Math.round(avg),
  };
}

/**
 * 최근 성능 메트릭 조회
 */
export function getRecentMetrics(limit: number = 100) {
  return metrics.slice(-limit).reverse();
}

/**
 * 느린 요청 조회
 */
export function getSlowRequests(threshold: number = 1000, limit: number = 50) {
  return metrics
    .filter(m => m.responseTime > threshold)
    .slice(-limit)
    .reverse();
}

/**
 * 에러 요청 조회
 */
export function getErrorRequests(limit: number = 50) {
  return metrics
    .filter(m => m.statusCode >= 400)
    .slice(-limit)
    .reverse();
}

/**
 * 전체 성능 요약
 */
export function getPerformanceSummary() {
  if (metrics.length === 0) return null;

  const responseTimes = metrics.map(m => m.responseTime);
  const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const successCount = metrics.filter(m => m.statusCode < 400).length;

  return {
    totalRequests: metrics.length,
    avgResponseTime: Math.round(avg),
    successRate: ((successCount / metrics.length) * 100).toFixed(2) + "%",
    topEndpoints: getAllEndpointStats().slice(0, 5),
  };
}

/**
 * 메트릭 초기화 (관리용)
 */
export function clearMetrics() {
  metrics.length = 0;
}
