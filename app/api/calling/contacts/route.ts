
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get matched users
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { userId: user.id },
          { matchedUserId: user.id },
        ],
      },
      select: {
        userId: true,
        matchedUserId: true,
      },
    });

    const contactIds = matches.map((m) =>
      m.userId === user.id ? m.matchedUserId : m.userId
    );

    const contacts = await prisma.user.findMany({
      where: {
        id: { in: contactIds },
      },
      select: {
        id: true,
        username: true,
        image: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Fetch contacts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}
