import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { respondToCall } from '@/lib/video-call-system';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyAuth(req);
    const { accepted } = await req.json();

    if (typeof accepted !== 'boolean') {
      return NextResponse.json(
        { error: 'accepted is required and must be boolean' },
        { status: 400 }
      );
    }

    const call = await respondToCall(params.id, userId, accepted);

    return NextResponse.json({
      success: true,
      data: call,
      message: accepted ? 'Call accepted' : 'Call rejected',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to respond to call';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
