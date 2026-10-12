
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get top users by badges
    const userStats = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        image: true,
        badges: {
          select: { id: true },
          where: { unlockedAt: { not: null } },
        },
        achievements: {
          select: {
            achievement: { select: { reward: true } },
          },
          where: { unlockedAt: { not: null } },
        },
      },
      orderBy: { badges: { _count: 'desc' } },
      take: 10,
    });

    // Calculate totals and rank
    const leaderboard = userStats.map((user, index) => ({
      id: user.id,
      username: user.username,
      image: user.image,
      badges: user.badges.length,
      totalPoints: user.achievements.reduce(
        (sum, a) => sum + (a.achievement?.reward || 0),
        0
      ),
      rank: index + 1,
    }));

    // Find user's rank
    const userRankIndex = leaderboard.findIndex((u) => u.id === user.id);
    const userRank =
      userRankIndex !== -1
        ? leaderboard[userRankIndex]
        : {
            id: user.id,
            username: '',
            badges: 0,
            totalPoints: 0,
            rank: userRankIndex + 1,
          };

    return NextResponse.json({ leaderboard, userRank });
  } catch (error) {
    console.error('Fetch leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
