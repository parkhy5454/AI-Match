
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportedUserId, reason, details } = await request.json();

    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        reportedUserId,
        reason,
        details,
        status: 'pending',
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
