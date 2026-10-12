import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { initiateVideoCall, type CallType } from '@/lib/video-call-system';

/**
 * POST /api/video-call/initiate
 * Initiate a video or audio call
 */
export async function POST(req: NextRequest) {
  try {
    const { id: userId } = await verifyAuth(req);
    const { recipientId, callType = 'video' } = await req.json();

    if (!recipientId) {
      return NextResponse.json(
        { error: 'recipientId is required' },
        { status: 400 }
      );
    }

    if (!['video', 'audio'].includes(callType)) {
      return NextResponse.json(
        { error: 'callType must be "video" or "audio"' },
        { status: 400 }
      );
    }

    const call = await initiateVideoCall(userId, recipientId, callType as CallType);

    return NextResponse.json({
      success: true,
      data: call,
      message: 'Call initiated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initiate call';
    const status = message.includes('Unauthorized') || message.includes('Cannot call') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
