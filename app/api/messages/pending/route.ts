import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const pendingMessages = await prisma.message.findMany({
      where: {
        receiverId: user.id,
        read: false,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(pendingMessages);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch pending messages' },
      { status: 500 }
    );
  }
}
