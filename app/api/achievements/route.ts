
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user achievements
    const userAchievements = await prisma.achievement.findMany({
      where: { userId: user.id },
    });

    // Get all achievement templates
    const templates = await prisma.achievementTemplate.findMany();

    // Combine with progress data
    const achievements = templates.map((template) => {
      const userAchievement = userAchievements.find(
        (a) => a.achievementId === template.id
      );
      return {
        id: template.id,
        name: template.name,
        description: template.description,
        icon: template.icon,
        category: template.category,
        progress: userAchievement?.progress || 0,
        target: template.target,
        reward: template.reward,
        isUnlocked: !!userAchievement?.unlockedAt,
        unlockedAt: userAchievement?.unlockedAt,
      };
    });

    return NextResponse.json(achievements);
  } catch (error) {
    console.error('Fetch achievements error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}
