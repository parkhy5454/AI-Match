
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { callId: string } }
) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const call = await prisma.call.update({
      where: { id: params.callId },
      data: { status: 'rejected', endedAt: new Date() },
    });

    return NextResponse.json(call);
  } catch (error) {
    console.error('Reject call error:', error);
    return NextResponse.json(
      { error: 'Failed to reject call' },
      { status: 500 }
    );
  }
}
