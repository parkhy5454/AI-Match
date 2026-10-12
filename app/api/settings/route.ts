import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      data: {
        notificationsEnabled: settings?.notificationsEnabled ?? true,
        emailNotifications: settings?.emailNotifications ?? true,
        pushNotifications: settings?.pushNotifications ?? false,
        privateProfile: settings?.privateProfile ?? false,
        showOnlineStatus: settings?.showOnlineStatus ?? true,
      },
    });
  } catch (error) {
    console.error('설정 조회 오류:', error);
    return NextResponse.json(
      { error: '설정 조회 실패' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const data = await request.json();

    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: data,
      create: {
        userId: user.id,
        ...data,
      },
    });

    return NextResponse.json({
      data: {
        notificationsEnabled: settings.notificationsEnabled,
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        privateProfile: settings.privateProfile,
        showOnlineStatus: settings.showOnlineStatus,
      },
    });
  } catch (error) {
    console.error('설정 업데이트 오류:', error);
    return NextResponse.json(
      { error: '설정 업데이트 실패' },
      { status: 500 }
    );
  }
}