
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, getWelcomeEmailTemplate } from '@/app/lib/email';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Prisma에서 사용자 정보 조회
    const userWithDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: { username: true, email: true }
    });

    if (!userWithDetails) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${user.id}`;
    const html = getWelcomeEmailTemplate(userWithDetails.username, verifyUrl);

    await sendEmail({
      to: userWithDetails.email,
      subject: 'AI-Match 이메일 인증',
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
