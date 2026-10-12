/**
 * Performance Report API
 * GET /api/performance/report - Get performance metrics report
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getWebVitalsMetrics,
  getPerformanceReport,
  getQueryPerformanceReport,
} from '@/lib/performance';

/**
 * GET /api/performance/report
 * Get comprehensive performance report
 */
export async function GET(request: NextRequest) {
  try {
    const report = {
      timestamp: new Date().toISOString(),
      api: getPerformanceReport(),
      queries: getQueryPerformanceReport(),
      environment: process.env.NODE_ENV,
    };

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Performance API] Error:', errorMsg);

    return NextResponse.json(
      {
        error: 'Failed to get performance report',
        message: errorMsg,
      },
      { status: 500 }
    );
  }
}
