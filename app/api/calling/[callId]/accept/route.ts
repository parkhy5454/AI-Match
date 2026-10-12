
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

    const { sdp } = await request.json();

    const call = await prisma.call.update({
      where: { id: params.callId },
      data: { status: 'active', sdp },
    });

    return NextResponse.json(call);
  } catch (error) {
    console.error('Accept call error:', error);
    return NextResponse.json(
      { error: 'Failed to accept call' },
      { status: 500 }
    );
  }
}
