
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [totalUsers, activeUsers, totalMatches, pendingReports] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: { lastSeen: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        }),
        prisma.match.count(),
        prisma.report.count({ where: { status: 'pending' } }),
      ]);

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalMatches,
      pendingReports,
      totalRevenue: 0,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
