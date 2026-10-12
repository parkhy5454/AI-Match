import { prisma } from '@/lib/db';

export interface TrustScoreFactors {
  profileCompletion: number;
  verificationStatus: number;
  reportCount: number;
  accountAge: number;
  activityLevel: number;
}

export async function calculateTrustScore(userId: string): Promise<number> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        reports: true,
      },
    });

    if (!user) return 0;

    const factors = getScoreFactors(user);
    const weights = {
      profileCompletion: 0.25,
      verificationStatus: 0.25,
      reportCount: 0.25,
      accountAge: 0.15,
      activityLevel: 0.1,
    };

    const score =
      factors.profileCompletion * weights.profileCompletion +
      factors.verificationStatus * weights.verificationStatus +
      factors.reportCount * weights.reportCount +
      factors.accountAge * weights.accountAge +
      factors.activityLevel * weights.activityLevel;

    return Math.min(100, Math.max(0, score));
  } catch (error) {
    console.error('Trust score calculation error:', error);
    return 50;
  }
}

function getScoreFactors(user: any): TrustScoreFactors {
  // Profile completion (0-100)
  const profileFields = [
    user.name,
    user.email,
    user.mbti,
    user.age,
    user.region,
    user.bio,
  ];
  const profileCompletion = (profileFields.filter(Boolean).length / 6) * 100;

  // Verification status (0-100)
  const verificationStatus = user.emailVerified ? 100 : 50;

  // Report count (0-100, decreases with more reports)
  const reportCount = Math.max(0, 100 - (user.reports?.length || 0) * 20);

  // Account age (0-100, increases with time)
  const createdAt = new Date(user.createdAt).getTime();
  const ageInDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
  const accountAge = Math.min(100, (ageInDays / 365) * 100);

  // Activity level (0-100)
  const activityLevel = user.lastLogin
    ? Math.min(100, ((Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24 * 7)) * 100)
    : 0;

  return {
    profileCompletion,
    verificationStatus,
    reportCount,
    accountAge,
    activityLevel,
  };
}

export async function updateTrustScores(): Promise<void> {
  try {
    const users = await prisma.user.findMany();

    for (const user of users) {
      const newScore = await calculateTrustScore(user.id);

      await prisma.user.update({
        where: { id: user.id },
        data: { trustScore: newScore },
      });
    }
  } catch (error) {
    console.error('Update trust scores error:', error);
  }
}
