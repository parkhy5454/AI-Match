
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user badges
    const userBadges = await prisma.badge.findMany({
      where: { userId: user.id },
      orderBy: { unlockedAt: 'desc' },
    });

    // Get all available badges
    const allBadges = await prisma.badgeTemplate.findMany();

    // Combine user badges with template info
    const badges = allBadges.map((template) => {
      const userBadge = userBadges.find((b) => b.badgeId === template.id);
      return {
        id: template.id,
        name: template.name,
        description: template.description,
        icon: template.icon,
        rarity: template.rarity,
        unlockedAt: userBadge?.unlockedAt,
        isLocked: !userBadge,
      };
    });

    return NextResponse.json(badges);
  } catch (error) {
    console.error('Fetch badges error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch badges' },
      { status: 500 }
    );
  }
}
