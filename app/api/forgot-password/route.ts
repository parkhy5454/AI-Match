import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { generateResetToken } from "@/lib/auth";
import { validateEmail } from "@/lib/validation";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "요청 형식이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "이메일을 입력해주세요" },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const normalizedEmail = String(email).toLowerCase().trim();
    const emailValidation = validateEmail(normalizedEmail);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error },
        { status: 400 }
      );
    }

    console.log("[Forgot Password API] 비밀번호 리셋 요청:", normalizedEmail);

    // 사용자 존재 확인
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    if (!user) {
      console.log("[Forgot Password API] 사용자 없음:", normalizedEmail);
      // 보안상 같은 메시지 반환 (사용자 존재 여부 숨김)
      return NextResponse.json({
        success: true,
        message: "등록된 이메일이면 재설정 링크가 발송됩니다",
      });
    }

    // 리셋 토큰 생성 (1시간 유효)
    const resetToken = generateResetToken(normalizedEmail);

    console.log("[Forgot Password API] 리셋 토큰 생성:", normalizedEmail);

    // 리셋 링크 생성
    // 프로덕션 환경에서는 항상 https://ai-match-qtra.onrender.com 사용
    const appUrl = process.env.NODE_ENV === 'production'
      ? 'https://ai-match-qtra.onrender.com'
      : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    // 디버깅: 환경 변수 로깅
    console.log('[Forgot Password API] 환경 변수 확인:', {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      appUrl: appUrl,
      resetLink: resetLink,
      NODE_ENV: process.env.NODE_ENV,
    });

    // Resend를 통한 이메일 전송
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: user.email,
        subject: "AI-Match 비밀번호 재설정",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">비밀번호 재설정</h2>
            <p>안녕하세요,</p>
            <p>비밀번호 재설정 요청을 받았습니다. 아래 링크를 클릭하여 새로운 비밀번호를 설정하세요.</p>
            <p style="color: #e74c3c; font-weight: bold;">이 링크는 1시간 동안만 유효합니다.</p>
            <p style="margin: 30px 0; text-align: center;">
              <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">비밀번호 재설정</a>
            </p>
            <p>또는 아래 링크를 복사하여 브라우저에 붙여넣으세요:</p>
            <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 12px;">
              ${resetLink}
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              이 요청을 하지 않았다면 이 이메일을 무시하셔도 됩니다.
            </p>
          </div>
        `,
      });

      console.log("[Forgot Password API] 이메일 전송 성공:", user.email);
    } catch (emailError) {
      console.error("[Forgot Password API] 이메일 전송 실패:", emailError);
      // 이메일 전송 실패해도 사용자에게는 성공 메시지 반환 (보안상 이유)
    }

    return NextResponse.json({
      success: true,
      message: "등록된 이메일이면 재설정 링크가 발송됩니다",
    });
  } catch (error) {
    console.error("[Forgot Password API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "비밀번호 찾기 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
