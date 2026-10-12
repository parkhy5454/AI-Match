import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/app/lib/prisma';
import { cacheDelPattern } from '@/app/lib/redis';
import { messageSchema } from '@/app/lib/validation';
import { handleApiError, getClientIp } from '@/app/lib/error-handler';
import { checkRateLimit } from '@/app/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const ip = getClientIp(request);
    const rateLimitCheck = checkRateLimit(ip, 'MESSAGE');
    if (rateLimitCheck.limited) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitCheck.resetTime),
          },
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate input
    const validation = messageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { content, receiverId } = validation.data;

    // Verify conversation exists or can be created
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
    }

    const message = await prisma.message.create({
      data: {
        senderId: user.id,
        receiverId,
        content,
      },
    });

    await cacheDelPattern(`messages:*:${receiverId}`);

    return NextResponse.json(message);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const receiverId = searchParams.get('receiverId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    if (!receiverId) {
      return NextResponse.json(
        { error: 'receiverId is required' },
        { status: 400 }
      );
    }

    // Verify access
    const hasConversation = await prisma.message.findFirst({
      where: {
        OR: [
          { senderId: user.id, receiverId },
          { senderId: receiverId, receiverId: user.id },
        ],
      },
    });

    if (!hasConversation && receiverId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: user.id, receiverId },
          { senderId: receiverId, receiverId: user.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        content: true,
        senderId: true,
        receiverId: true,
        createdAt: true,
        read: true,
      },
    });

    return NextResponse.json(messages.reverse());
  } catch (error) {
    return handleApiError(error);
  }
}
