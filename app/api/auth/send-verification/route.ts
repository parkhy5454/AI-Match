
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, getWelcomeEmailTemplate } from '@/app/lib/email';

export async function POST(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${user.id}`;
    const html = getWelcomeEmailTemplate(user.username, verifyUrl);

    await sendEmail({
      to: user.email,
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
