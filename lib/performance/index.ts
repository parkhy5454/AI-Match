/**
 * Performance Monitoring Module Exports
 */

export {
  initWebVitals,
  getWebVitalsMetrics,
  getMetricRating,
  formatMetric,
  getMetricDescription,
  VITALS_THRESHOLDS,
  type WebVitalsMetrics,
  type PerformanceMetric,
} from './webVitals';

export {
  ApiPerformanceTracker,
  apiMetrics,
  apiPerformanceMiddleware,
  useFetchMonitoring,
  getPerformanceReport,
  type ApiMetric,
} from './apiPerformance';

export {
  QueryPerformanceTracker,
  queryMetrics,
  createQueryPerformanceMiddleware,
  getQueryPerformanceReport,
  type QueryMetric,
} from './queryPerformance';
