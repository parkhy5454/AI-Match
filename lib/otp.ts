import { db } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * OTP 코드 생성 (6자리 숫자)
 */
export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * OTP 코드 저장 및 이메일 발송
 */
export async function sendOTPEmail(
  email: string,
  type: "signup" | "login" | "password-reset"
): Promise<{ success: boolean; error?: string }> {
  try {
    const code = generateOTPCode();

    // 기존 OTP 코드 찾기 (사용되지 않은 것)
    const existingOTP = await db.otpCode.findFirst({
      where: {
        email,
        type,
        used: false,
      },
    });

    // 기존 코드가 있으면 삭제 (새 코드로 발급)
    if (existingOTP) {
      await db.otpCode.delete({
        where: { id: existingOTP.id },
      });
    }

    // 10분 후 만료되는 OTP 생성
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // DB에 저장
    await db.otpCode.create({
      data: {
        email,
        code,
        type,
        expiresAt,
      },
    });

    // 이메일 발송
    const typeLabel = {
      signup: "가입",
      login: "로그인",
      "password-reset": "비밀번호 재설정",
    }[type];

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>이메일 인증</h2>
        <p>AI Match ${typeLabel}을 위해 다음 인증 코드를 입력해주세요:</p>
        <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h1 style="color: #333; letter-spacing: 5px;">${code}</h1>
        </div>
        <p>이 코드는 <strong>10분</strong> 동안 유효합니다.</p>
        <p>코드를 요청하지 않으셨다면 이 이메일을 무시해주세요.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">
          이것은 자동 발송되는 이메일입니다. 회신하지 마세요.
        </p>
      </div>
    `;

    const response = await resend.emails.send({
      from: "noreply@ai-match.com",
      to: email,
      subject: `[AI Match] ${typeLabel} 인증 코드: ${code}`,
      html: emailHtml,
    });

    if (response.error) {
      console.error("이메일 발송 실패:", response.error);
      return { success: false, error: "이메일 발송에 실패했습니다" };
    }

    console.log(`[OTP] ${type} OTP 발송 성공:`, email);
    return { success: true };
  } catch (error) {
    console.error("[OTP] OTP 발송 중 오류:", error);
    return { success: false, error: "OTP 발송 중 오류가 발생했습니다" };
  }
}

/**
 * OTP 코드 검증
 */
export async function verifyOTPCode(
  email: string,
  code: string,
  type: "signup" | "login" | "password-reset"
): Promise<{ valid: boolean; error?: string }> {
  try {
    const otpRecord = await db.otpCode.findFirst({
      where: {
        email,
        code,
        type,
        used: false,
      },
    });

    if (!otpRecord) {
      return { valid: false, error: "유효하지 않은 인증 코드입니다" };
    }

    // 만료 확인
    if (otpRecord.expiresAt < new Date()) {
      return { valid: false, error: "인증 코드가 만료되었습니다" };
    }

    // OTP 사용 처리
    await db.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true, usedAt: new Date() },
    });

    console.log(`[OTP] ${type} OTP 검증 성공:`, email);
    return { valid: true };
  } catch (error) {
    console.error("[OTP] OTP 검증 중 오류:", error);
    return { valid: false, error: "OTP 검증 중 오류가 발생했습니다" };
  }
}

/**
 * 사용자의 최근 OTP 확인 (만료되지 않은)
 */
export async function checkRecentOTP(
  email: string,
  type: "signup" | "login" | "password-reset"
) {
  try {
    const otpRecord = await db.otpCode.findFirst({
      where: {
        email,
        type,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return otpRecord || null;
  } catch (error) {
    console.error("[OTP] 최근 OTP 조회 중 오류:", error);
    return null;
  }
}

/**
 * 만료된 OTP 정리 (관리용)
 */
export async function cleanupExpiredOTP() {
  try {
    const result = await db.otpCode.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    console.log(`[OTP] 만료된 ${result.count}개 OTP 정리 완료`);
    return result.count;
  } catch (error) {
    console.error("[OTP] 만료된 OTP 정리 중 오류:", error);
    return 0;
  }
}
