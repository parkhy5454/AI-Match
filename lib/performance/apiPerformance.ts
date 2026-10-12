/**
 * API Performance Monitoring
 * Tracks API response times and performance metrics
 */

import * as Sentry from '@sentry/nextjs';

export interface ApiMetric {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: number;
  size?: number;
  cached?: boolean;
}

/**
 * Performance tracker for API calls
 */
export class ApiPerformanceTracker {
  private startTime: number = 0;
  private endpoint: string = '';
  private method: string = '';

  /**
   * Start tracking an API call
   */
  start(endpoint: string, method: string = 'GET'): void {
    this.startTime = performance.now();
    this.endpoint = endpoint;
    this.method = method;
  }

  /**
   * End tracking and record metric
   */
  end(statusCode: number = 200, size: number = 0, cached: boolean = false): ApiMetric {
    const duration = performance.now() - this.startTime;

    const metric: ApiMetric = {
      endpoint: this.endpoint,
      method: this.method,
      duration,
      statusCode,
      timestamp: Date.now(),
      size,
      cached,
    };

    this.recordMetric(metric);
    return metric;
  }

  /**
   * Record metric to Sentry
   */
  private recordMetric(metric: ApiMetric): void {
    const { endpoint, method, duration, statusCode, size, cached } = metric;

    // Determine if slow
    const isSlow = duration > 1000;
    const level = isSlow ? 'warning' : 'info';

    Sentry.captureMessage(`API: ${method} ${endpoint}`, level, {
      tags: {
        api_endpoint: endpoint,
        api_method: method,
        status_code: statusCode.toString(),
        duration_ms: duration.toFixed(0),
      },
      contexts: {
        api_performance: {
          endpoint,
          method,
          duration: duration.toFixed(2),
          statusCode,
          size,
          cached,
        },
      },
    });

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[API Performance] ${method} ${endpoint} - ${duration.toFixed(0)}ms (${statusCode})`
      );
    }
  }
}

/**
 * Global API performance metrics storage
 */
class ApiPerformanceMetrics {
  private metrics: ApiMetric[] = [];
  private readonly maxMetrics = 100;

  /**
   * Add metric
   */
  add(metric: ApiMetric): void {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get average duration for endpoint
   */
  getAverageDuration(endpoint: string, method: string = 'GET'): number {
    const filtered = this.metrics.filter((m) => m.endpoint === endpoint && m.method === method);

    if (filtered.length === 0) return 0;

    const sum = filtered.reduce((acc, m) => acc + m.duration, 0);
    return sum / filtered.length;
  }

  /**
   * Get slowest endpoints
   */
  getSlowestEndpoints(limit: number = 5): ApiMetric[] {
    return this.metrics.sort((a, b) => b.duration - a.duration).slice(0, limit);
  }

  /**
   * Get failed requests
   */
  getFailedRequests(limit: number = 10): ApiMetric[] {
    return this.metrics
      .filter((m) => m.statusCode >= 400)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    if (this.metrics.length === 0) {
      return {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        slowRequests: 0,
        failedRequests: 0,
      };
    }

    const durations = this.metrics.map((m) => m.duration);
    const average = durations.reduce((a, b) => a + b, 0) / durations.length;
    const slowRequests = this.metrics.filter((m) => m.duration > 1000).length;
    const failedRequests = this.metrics.filter((m) => m.statusCode >= 400).length;

    return {
      total: this.metrics.length,
      average: average.toFixed(2),
      min: Math.min(...durations).toFixed(2),
      max: Math.max(...durations).toFixed(2),
      slowRequests,
      failedRequests,
    };
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get all metrics
   */
  getAll(): ApiMetric[] {
    return [...this.metrics];
  }
}

// Global instance
export const apiMetrics = new ApiPerformanceMetrics();

/**
 * Middleware for Next.js API routes
 */
export function apiPerformanceMiddleware(
  handler: (req: any, res: any) => Promise<void>
) {
  return async (req: any, res: any) => {
    const tracker = new ApiPerformanceTracker();
    tracker.start(`${req.nextUrl.pathname}`, req.method);

    // Track response
    const originalJson = res.json;
    let statusCode = 200;

    res.json = function (data: any) {
      statusCode = res.statusCode || 200;
      const metric = tracker.end(statusCode, JSON.stringify(data).length);
      apiMetrics.add(metric);
      return originalJson.call(this, data);
    };

    try {
      await handler(req, res);
    } catch (error) {
      tracker.end(500);
      throw error;
    }
  };
}

/**
 * Hook for client-side fetch monitoring
 */
export function useFetchMonitoring() {
  if (typeof window === 'undefined') {
    return;
  }

  // Wrap fetch
  const originalFetch = window.fetch;

  window.fetch = function (...args: any[]) {
    const tracker = new ApiPerformanceTracker();
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    const method = (args[1]?.method || 'GET').toUpperCase();

    tracker.start(url, method);

    return originalFetch.apply(this, args).then((response: any) => {
      const metric = tracker.end(response.status);
      apiMetrics.add(metric);
      return response;
    });
  } as any;

  console.log('[API Performance] Fetch monitoring enabled');
}

/**
 * Get performance report
 */
export function getPerformanceReport() {
  return {
    summary: apiMetrics.getSummary(),
    slowest: apiMetrics.getSlowestEndpoints(5),
    failed: apiMetrics.getFailedRequests(10),
    timestamp: new Date().toISOString(),
  };
}
