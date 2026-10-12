import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/app/lib/prisma';
import { checkUserFraud } from '@/app/lib/fraud-detection';
import { calculateTrustScore } from '@/app/lib/trust-score';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    // Get all users
    const users = await prisma.user.findMany();
    const filtered = [];

    for (const u of users) {
      const fraud = await checkUserFraud(u.id);
      const trustScore = await calculateTrustScore(u.id);

      if (fraud.riskLevel === 'critical' || trustScore < 30) {
        filtered.push({
          userId: u.id,
          username: u.name,
          trustScore,
          riskLevel: fraud.riskLevel,
          action: 'blocked',
        });

        // Auto-block user
        await prisma.user.update({
          where: { id: u.id },
          data: { status: 'blocked' },
        });
      }
    }

    return NextResponse.json({
      processedCount: users.length,
      filteredCount: filtered.length,
      filtered,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Auto-filter failed' },
      { status: 500 }
    );
  }
}
