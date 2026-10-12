import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import redis from '@/app/lib/redis';

export async function GET() {
  try {
    // Check database
    const dbCheck = await prisma.$queryRaw`SELECT 1`.catch(() => false);

    // Check Redis
    const redisCheck = await redis.ping().catch(() => null);

    const isHealthy = dbCheck && redisCheck === 'PONG';

    return NextResponse.json(
      {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbCheck ? 'ok' : 'error',
          redis: redisCheck === 'PONG' ? 'ok' : 'error',
        },
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: String(error),
      },
      { status: 503 }
    );
  }
}
