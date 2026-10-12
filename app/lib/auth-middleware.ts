import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from './prisma';

export async function requireAuth(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return {
      authenticated: false,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return {
      authenticated: false,
      error: NextResponse.json({ error: 'User not found' }, { status: 404 }),
    };
  }

  return { authenticated: true, user };
}

export async function requireAdmin(request: NextRequest) {
  const auth = await requireAuth(request);

  if (!auth.authenticated) {
    return auth.error;
  }

  if (auth.user?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  return null;
}

export async function checkDataOwnership(
  userId: string,
  resourceOwnerId: string
): Promise<boolean> {
  return userId === resourceOwnerId;
}
