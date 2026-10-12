/**
 * Web Vitals Performance Monitoring
 * Measures Core Web Vitals and sends to Sentry
 */

import * as Sentry from '@sentry/nextjs';

// Dynamic import for web-vitals to handle different versions
let getCLS: any, getFID: any, getFCP: any, getLCP: any, getTTFB: any;
let Metric: any;

try {
  const webVitals = require('web-vitals');
  getCLS = webVitals.getCLS || webVitals.default?.getCLS;
  getFID = webVitals.getFID || webVitals.default?.getFID;
  getFCP = webVitals.getFCP || webVitals.default?.getFCP;
  getLCP = webVitals.getLCP || webVitals.default?.getLCP;
  getTTFB = webVitals.getTTFB || webVitals.default?.getTTFB;
  Metric = webVitals.Metric || webVitals.default?.Metric;
} catch (error) {
  console.warn('[Web Vitals] Failed to import web-vitals, monitoring disabled:', error);
}

export interface WebVitalsMetrics {
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  FCP?: number; // First Contentful Paint
  TTFB?: number; // Time to First Byte
  timestamp: number;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
  timestamp: number;
}

/**
 * Send metric to Sentry
 */
function sendMetricToSentry(metric: Metric): void {
  const { name, value, rating, delta, id, navigationType } = metric;

  // Determine severity level
  const severity = rating === 'good' ? 'info' : rating === 'needs-improvement' ? 'warning' : 'error';

  // Send to Sentry
  Sentry.captureMessage(`Web Vitals: ${name}`, severity, {
    tags: {
      metric_name: name,
      rating,
      navigation_type: navigationType,
    },
    contexts: {
      web_vitals: {
        name,
        value: value.toFixed(2),
        rating,
        delta: delta.toFixed(2),
        id,
        navigationType,
      },
    },
  });

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${name}: ${value.toFixed(2)} (${rating})`);
  }
}

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitals(): void {
  if (typeof window === 'undefined') {
    return; // Server-side, skip
  }

  try {
    // Check if web-vitals functions are available
    if (!getCLS || !getFID || !getLCP || !getFCP || !getTTFB) {
      console.warn('[Web Vitals] Web Vitals functions not available, skipping initialization');
      return;
    }

    // Measure Core Web Vitals
    if (typeof getCLS === 'function') getCLS(sendMetricToSentry);
    if (typeof getFID === 'function') getFID(sendMetricToSentry);
    if (typeof getLCP === 'function') getLCP(sendMetricToSentry);
    if (typeof getFCP === 'function') getFCP(sendMetricToSentry);
    if (typeof getTTFB === 'function') getTTFB(sendMetricToSentry);

    console.log('[Web Vitals] Monitoring initialized');
  } catch (error) {
    console.error('[Web Vitals] Error initializing:', error);
  }
}

/**
 * Get current Web Vitals metrics
 */
export async function getWebVitalsMetrics(): Promise<WebVitalsMetrics> {
  return new Promise((resolve) => {
    const metrics: WebVitalsMetrics = {
      timestamp: Date.now(),
    };

    // Check if web-vitals functions are available
    if (!getCLS || !getFID || !getLCP || !getFCP || !getTTFB) {
      console.warn('[Web Vitals] Web Vitals functions not available');
      resolve(metrics);
      return;
    }

    let completed = 0;

    const onMetric = (metric: Metric) => {
      const { name, value } = metric;

      if (name === 'LCP') metrics.LCP = value;
      else if (name === 'FID') metrics.FID = value;
      else if (name === 'CLS') metrics.CLS = value;
      else if (name === 'FCP') metrics.FCP = value;
      else if (name === 'TTFB') metrics.TTFB = value;

      completed++;
      if (completed >= 5) {
        resolve(metrics);
      }
    };

    if (typeof getCLS === 'function') getCLS(onMetric);
    if (typeof getFID === 'function') getFID(onMetric);
    if (typeof getLCP === 'function') getLCP(onMetric);
    if (typeof getFCP === 'function') getFCP(onMetric);
    if (typeof getTTFB === 'function') getTTFB(onMetric);

    // Timeout in case some metrics don't report
    setTimeout(() => {
      resolve(metrics);
    }, 5000);
  });
}

/**
 * Get performance thresholds
 */
export const VITALS_THRESHOLDS = {
  LCP: { good: 2500, 'needs-improvement': 4000 }, // Largest Contentful Paint
  FID: { good: 100, 'needs-improvement': 300 }, // First Input Delay
  CLS: { good: 0.1, 'needs-improvement': 0.25 }, // Cumulative Layout Shift
  FCP: { good: 1800, 'needs-improvement': 3000 }, // First Contentful Paint
  TTFB: { good: 600, 'needs-improvement': 1800 }, // Time to First Byte
};

/**
 * Get rating for metric value
 */
export function getMetricRating(
  metricName: string,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = VITALS_THRESHOLDS[metricName as keyof typeof VITALS_THRESHOLDS];

  if (!thresholds) {
    return 'good';
  }

  if (value <= thresholds.good) {
    return 'good';
  } else if (value <= thresholds['needs-improvement']) {
    return 'needs-improvement';
  } else {
    return 'poor';
  }
}

/**
 * Format metric for display
 */
export function formatMetric(name: string, value: number): string {
  switch (name) {
    case 'LCP':
    case 'FCP':
    case 'TTFB':
      return `${value.toFixed(0)}ms`;
    case 'FID':
      return `${value.toFixed(0)}ms`;
    case 'CLS':
      return value.toFixed(3);
    default:
      return `${value.toFixed(2)}`;
  }
}

/**
 * Get metric description
 */
export function getMetricDescription(name: string): string {
  const descriptions: Record<string, string> = {
    LCP: 'Largest Contentful Paint - Loading Performance',
    FID: 'First Input Delay - Interactivity',
    CLS: 'Cumulative Layout Shift - Visual Stability',
    FCP: 'First Contentful Paint - Perceived Load Speed',
    TTFB: 'Time to First Byte - Server Response Time',
  };

  return descriptions[name] || name;
}
