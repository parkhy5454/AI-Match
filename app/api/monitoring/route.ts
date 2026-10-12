/**
 * Sentry Monitoring Tunnel Endpoint
 * Routes Sentry events through your own domain instead of directly to Sentry
 * This can help bypass ad blockers and CORS issues
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const projectId = process.env.SENTRY_PROJECT || 'ai-match';
    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

    if (!sentryDsn) {
      return NextResponse.json(
        { error: 'Sentry DSN not configured' },
        { status: 500 }
      );
    }

    // Extract project ID from DSN
    const dsnUrl = new URL(sentryDsn);
    const dsnProjectId = dsnUrl.pathname.replace('/', '');

    // Get the raw body
    const body = await request.text();

    // Forward to Sentry
    const sentryIngestUrl = `https://${dsnUrl.hostname}/api/${dsnProjectId}/envelope/`;

    const response = await fetch(sentryIngestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
      },
      body,
    });

    // Return Sentry's response
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('[Monitoring Tunnel] Error forwarding to Sentry:', error);

    return NextResponse.json(
      { error: 'Failed to forward monitoring data' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Sentry monitoring tunnel is active',
    timestamp: new Date().toISOString(),
  });
}
