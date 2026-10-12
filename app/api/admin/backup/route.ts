import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/app/lib/prisma';
import { execSync } from 'child_process';
import logger from '@/app/lib/logger';

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

    logger.info('Starting manual backup', { userId: user.id });

    const backupResults = {
      database: false,
      redis: false,
      timestamp: new Date().toISOString(),
    };

    // Database backup
    try {
      execSync('bash scripts/backup-database.sh');
      backupResults.database = true;
      logger.info('Database backup completed');
    } catch (error) {
      logger.error('Database backup failed', { error: String(error) });
    }

    // Redis backup
    try {
      execSync('bash scripts/backup-redis.sh');
      backupResults.redis = true;
      logger.info('Redis backup completed');
    } catch (error) {
      logger.error('Redis backup failed', { error: String(error) });
    }

    return NextResponse.json(backupResults);
  } catch (error) {
    logger.error('Backup error', { error: String(error) });
    return NextResponse.json(
      { error: 'Backup failed' },
      { status: 500 }
    );
  }
}
