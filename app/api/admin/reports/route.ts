
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

    const reports = await prisma.report.findMany({
      where: { status: 'pending' },
      include: {
        reporter: { select: { username: true } },
        reportedUser: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      reports.map((r) => ({
        id: r.id,
        reporterId: r.reporterId,
        reporterName: r.reporter.username,
        reportedUserId: r.reportedUserId,
        reportedUsername: r.reportedUser.username,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt,
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
