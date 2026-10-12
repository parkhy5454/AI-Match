
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId } = await request.json();

    const call = await prisma.call.update({
      where: { id: callId },
      data: { status: 'ended', endedAt: new Date() },
    });

    return NextResponse.json(call);
  } catch (error) {
    console.error('End call error:', error);
    return NextResponse.json(
      { error: 'Failed to end call' },
      { status: 500 }
    );
  }
}
