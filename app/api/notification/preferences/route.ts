
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await prisma.notificationPreferences.findUnique({
      where: { userId: user.id },
    });

    if (!preferences) {
      const defaultPreferences = {
        userId: user.id,
        emailNotifications: true,
        pushNotifications: true,
        likeNotifications: true,
        matchNotifications: true,
        messageNotifications: true,
        systemNotifications: true,
        notificationFrequency: 'instant',
      };

      const created = await prisma.notificationPreferences.create({
        data: defaultPreferences,
      });

      return NextResponse.json(created);
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Fetch preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    const preferences = await prisma.notificationPreferences.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    });

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
