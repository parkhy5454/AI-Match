import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { endCall } from '@/lib/video-call-system';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyAuth(req);
    const call = await endCall(params.id, userId);

    return NextResponse.json({
      success: true,
      data: call,
      message: 'Call ended successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to end call';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
