/**
 * Database Query Performance Monitoring
 * Tracks Prisma query performance
 */

import * as Sentry from '@sentry/nextjs';

export interface QueryMetric {
  query: string;
  duration: number;
  timestamp: number;
  model?: string;
  operation?: string; // 'create', 'read', 'update', 'delete'
  rowsAffected?: number;
}

/**
 * Query performance tracker
 */
export class QueryPerformanceTracker {
  private metrics: QueryMetric[] = [];
  private readonly maxMetrics = 100;

  /**
   * Record a query
   */
  recordQuery(metric: QueryMetric): void {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Send slow queries to Sentry
    if (metric.duration > 1000) {
      Sentry.captureMessage(`Slow Query: ${metric.model || 'Unknown'}`, 'warning', {
        tags: {
          query_model: metric.model || 'unknown',
          query_operation: metric.operation || 'unknown',
          duration_ms: metric.duration.toFixed(0),
        },
        contexts: {
          database_query: {
            model: metric.model,
            operation: metric.operation,
            duration: metric.duration.toFixed(2),
            rowsAffected: metric.rowsAffected,
          },
        },
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Query Performance] ${metric.model}::${metric.operation} - ${metric.duration.toFixed(0)}ms`
      );
    }
  }

  /**
   * Get all metrics
   */
  getAll(): QueryMetric[] {
    return [...this.metrics];
  }

  /**
   * Get average query time
   */
  getAverageTime(model?: string): number {
    let filtered = this.metrics;

    if (model) {
      filtered = filtered.filter((m) => m.model === model);
    }

    if (filtered.length === 0) return 0;

    const sum = filtered.reduce((acc, m) => acc + m.duration, 0);
    return sum / filtered.length;
  }

  /**
   * Get slowest queries
   */
  getSlowestQueries(limit: number = 10): QueryMetric[] {
    return this.metrics.sort((a, b) => b.duration - a.duration).slice(0, limit);
  }

  /**
   * Get query summary by model
   */
  getSummaryByModel() {
    const summary: Record<
      string,
      {
        count: number;
        average: number;
        min: number;
        max: number;
      }
    > = {};

    this.metrics.forEach((metric) => {
      const model = metric.model || 'unknown';

      if (!summary[model]) {
        summary[model] = {
          count: 0,
          average: 0,
          min: Infinity,
          max: 0,
        };
      }

      summary[model].count++;
      summary[model].min = Math.min(summary[model].min, metric.duration);
      summary[model].max = Math.max(summary[model].max, metric.duration);
    });

    // Calculate averages
    Object.keys(summary).forEach((model) => {
      const modelMetrics = this.metrics.filter((m) => m.model === model);
      const avg =
        modelMetrics.reduce((sum, m) => sum + m.duration, 0) / modelMetrics.length;
      summary[model].average = parseFloat(avg.toFixed(2));
    });

    return summary;
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = [];
  }
}

// Global instance
export const queryMetrics = new QueryPerformanceTracker();

/**
 * Prisma middleware for query performance monitoring
 */
export function createQueryPerformanceMiddleware() {
  return async (params: any, next: any) => {
    const start = performance.now();

    try {
      const result = await next(params);
      const duration = performance.now() - start;

      queryMetrics.recordQuery({
        query: params.model ? `${params.model}.${params.action}` : 'unknown',
        duration,
        timestamp: Date.now(),
        model: params.model,
        operation: params.action,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;

      queryMetrics.recordQuery({
        query: params.model ? `${params.model}.${params.action}` : 'unknown',
        duration,
        timestamp: Date.now(),
        model: params.model,
        operation: params.action,
      });

      throw error;
    }
  };
}

/**
 * Get query performance report
 */
export function getQueryPerformanceReport() {
  return {
    summary: queryMetrics.getSummaryByModel(),
    slowest: queryMetrics.getSlowestQueries(10),
    totalQueries: queryMetrics.getAll().length,
    timestamp: new Date().toISOString(),
  };
}
