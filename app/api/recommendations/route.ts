
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface UserProfile {
  age: number;
  mbti: string;
  interests: string[];
  region: string;
}

function calculateMBTICompatibility(mbti1: string, mbti2: string): number {
  const compatibility: Record<string, Record<string, number>> = {
    ENFP: { INTJ: 95, INFJ: 90, ENFJ: 85, INFP: 88 },
    INTJ: { ENFP: 95, INFP: 88, ENFJ: 80, INFJ: 92 },
  };
  return compatibility[mbti1]?.[mbti2] || 70;
}

function calculateInterestScore(interests1: string[], interests2: string[]): number {
  const intersection = interests1.filter(i => interests2.includes(i)).length;
  return (intersection / Math.max(interests1.length, interests2.length)) * 100;
}

function calculateAgeCompatibility(age1: number, age2: number): number {
  const ageDiff = Math.abs(age1 - age2);
  if (ageDiff <= 3) return 100;
  if (ageDiff <= 5) return 80;
  if (ageDiff <= 10) return 60;
  return 40;
}

async function calculateMatchScore(user: any, candidate: any): Promise<number> {
  const mbtiScore = calculateMBTICompatibility(user.mbti, candidate.mbti);
  const interestScore = calculateInterestScore(user.interests, candidate.interests);
  const ageScore = calculateAgeCompatibility(user.age, candidate.age);
  
  return (mbtiScore * 0.4 + interestScore * 0.3 + ageScore * 0.3);
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await auth(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { profile: true },
    });

    if (!user?.profile) {
      return NextResponse.json([]);
    }

    const candidates = await prisma.user.findMany({
      where: {
        NOT: { id: user.id },
        profile: { NOT: { bio: null } },
      },
      include: { profile: true },
      take: 50,
    });

    const scoredCandidates = await Promise.all(
      candidates.map(async (candidate) => {
        const matchScore = await calculateMatchScore(user.profile, candidate.profile);
        return {
          id: candidate.id,
          username: candidate.username,
          image: candidate.image,
          age: candidate.profile?.age || 0,
          region: candidate.profile?.region || '',
          mbti: candidate.profile?.mbti || '',
          bio: candidate.profile?.bio || '',
          compatibility: Math.round(matchScore),
          matchScore,
        };
      })
    );

    const sorted = scoredCandidates
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20);

    return NextResponse.json(sorted);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
