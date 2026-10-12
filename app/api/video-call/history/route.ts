import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getCallHistory } from '@/lib/video-call-system';

export async function GET(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    const calls = await getCallHistory(userId, limit, offset);

    return NextResponse.json({
      success: true,
      data: calls,
      pagination: { limit, offset },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get call history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
