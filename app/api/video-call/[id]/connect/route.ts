import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { connectToCall } from '@/lib/video-call-system';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyAuth(req);
    const session = await connectToCall(params.id, userId);

    return NextResponse.json({
      success: true,
      data: session,
      message: 'Connected to call',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to connect to call';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
