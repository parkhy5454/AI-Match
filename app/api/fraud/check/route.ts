import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { checkUserFraud, detectAnomalousPattern } from '@/app/lib/fraud-detection';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'userId required' },
        { status: 400 }
      );
    }

    const fraud = await checkUserFraud(targetUserId);
    const anomaly = await detectAnomalousPattern(targetUserId);

    return NextResponse.json({
      fraud,
      anomaly,
      shouldBlock: fraud.riskLevel === 'critical',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Fraud check failed' },
      { status: 500 }
    );
  }
}
