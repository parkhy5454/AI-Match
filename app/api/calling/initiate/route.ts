
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientId, sdp } = await request.json();

    // Create call record
    const call = await prisma.call.create({
      data: {
        callerId: user.id,
        recipientId,
        status: 'ringing',
        sdp,
        startedAt: new Date(),
      },
    });

    // TODO: Send WebSocket message to recipient

    return NextResponse.json(call);
  } catch (error) {
    console.error('Initiate call error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate call' },
      { status: 500 }
    );
  }
}
