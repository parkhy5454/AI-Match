import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { calculateTrustScore } from '@/app/lib/trust-score';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId required' },
        { status: 400 }
      );
    }

    const score = await calculateTrustScore(userId);

    let level: 'critical' | 'low' | 'medium' | 'high';
    if (score >= 80) level = 'high';
    else if (score >= 50) level = 'medium';
    else if (score >= 20) level = 'low';
    else level = 'critical';

    return NextResponse.json({
      userId,
      score,
      level,
      verified: score >= 70,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Trust score calculation failed' },
      { status: 500 }
    );
  }
}
