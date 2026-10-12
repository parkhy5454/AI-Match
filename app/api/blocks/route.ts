
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const blocks = await prisma.block.findMany({
      where: { blockerId: user.id },
      include: {
        blockedUser: { select: { id: true, username: true } },
      },
    });

    return NextResponse.json(
      blocks.map((b) => ({ ...b.blockedUser, blockedAt: b.createdAt }))
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch blocks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { blockedUserId } = await request.json();

    await prisma.block.create({
      data: { blockerId: user.id, blockedUserId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
  }
}
