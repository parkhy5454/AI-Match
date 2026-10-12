
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalMatches,
      matchesThisWeek,
      totalMessages,
      messagesThisWeek,
      totalLikes,
      likesThisWeek,
      profileViews,
    ] = await Promise.all([
      prisma.match.count({ where: { OR: [{ userId: user.id }, { matchedUserId: user.id }] } }),
      prisma.match.count({
        where: {
          OR: [{ userId: user.id }, { matchedUserId: user.id }],
          createdAt: { gte: weekAgo },
        },
      }),
      prisma.message.count({ where: { senderId: user.id } }),
      prisma.message.count({
        where: { senderId: user.id, createdAt: { gte: weekAgo } },
      }),
      prisma.like.count({ where: { likerId: user.id } }),
      prisma.like.count({
        where: { likerId: user.id, createdAt: { gte: weekAgo } },
      }),
      prisma.profileView.count({ where: { profileUserId: user.id } }),
    ]);

    const responseRate = 0; // TODO: Calculate from messages

    return NextResponse.json({
      totalMatches,
      totalMessages,
      totalLikes,
      matchesThisWeek,
      messagesThisWeek,
      likesThisWeek,
      profileViews,
      responseRate,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
