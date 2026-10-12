import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, generateRefreshToken } from "@/lib/auth";
import { validateEmail, validatePassword } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimiter";
import {
  recordLoginAttempt,
  getRecentFailedAttempts,
  detectSuspiciousActivity
} from "@/lib/loginTracking";
import {
  checkAccountLock,
  handleLoginFailure,
  resetLockOnSuccessfulLogin
} from "@/lib/accountLocking";

export async function POST(req: NextRequest) {
  try {
    // IP 주소와 User Agent 추출
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Rate limiting - IP당 5분에 10회 시도로 제한
    const rateLimitKey = `login:${ip}`;
    const rateLimit = checkRateLimit(rateLimitKey, 10, 5 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
      );
    }

    // 의심스러운 IP 활동 감지
    const isSuspicious = await detectSuspiciousActivity(ip, 10);
    if (isSuspicious) {
      console.warn("[Login API] 의심스러운 IP 활동 감지:", ip);
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("[Login API] JSON 파싱 에러:", parseError);
      return NextResponse.json(
        { success: false, error: "요청 형식이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "").trim();

    // 이메일과 비밀번호 검증
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "이메일과 비밀번호를 입력해주세요" },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error },
        { status: 400 }
      );
    }

    // 주의: 로그인 시에는 비밀번호 정책을 검증하지 않습니다.
    // 비밀번호 정책 검증은 회원가입 시에만 수행됩니다.
    // 로그인은 저장된 비밀번호 해시와만 비교합니다.

    console.log("[Login API] 로그인 시도:", email);

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, password: true, email: true },
    });

    if (!user) {
      console.log("[Login API] 사용자 없음:", email);
      // 로그인 실패 기록
      await recordLoginAttempt(email, ip, userAgent, false, "user_not_found");

      return NextResponse.json(
        { success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다" },
        { status: 401 }
      );
    }

    // 계정 잠금 확인
    const { locked, remainingMinutes } = await checkAccountLock(user.id);
    if (locked) {
      console.warn("[Login API] 계정이 일시 정지됨:", email, `(${remainingMinutes}분 남음)`);
      await recordLoginAttempt(email, ip, userAgent, false, "account_suspended");

      return NextResponse.json(
        {
          success: false,
          error: `계정이 일시 정지되었습니다. ${remainingMinutes}분 후 다시 시도해주세요.`,
          remainingMinutes,
        },
        { status: 403 }
      );
    }

    try {
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        console.log("[Login API] 비밀번호 불일치:", email);
        // 로그인 실패 기록
        await recordLoginAttempt(email, ip, userAgent, false, "invalid_password");

        // 계정 잠금 처리 (3회 실패 시)
        const isLocked = await handleLoginFailure(email, user.id);

        // 최근 실패 횟수 확인
        const failedAttempts = await getRecentFailedAttempts(email, 15);
        if (failedAttempts > 5) {
          console.warn("[Login API] 반복된 비밀번호 오류:", email, `(${failedAttempts}회)`);
        }

        const errorMessage = isLocked
          ? "비밀번호 오류가 반복되어 계정이 30분간 일시 정지되었습니다."
          : "이메일 또는 비밀번호가 올바르지 않습니다";

        const statusCode = isLocked ? 403 : 401;

        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
            remainingAttempts: isLocked ? 0 : Math.max(3 - failedAttempts, 0),
          },
          { status: statusCode }
        );
      }
    } catch (bcryptError) {
      console.error("[Login API] 비밀번호 비교 에러:", bcryptError);
      return NextResponse.json(
        { success: false, error: "로그인 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }

    // 토큰 생성 (액세스 토큰 + 리프레시 토큰)
    let accessToken;
    let refreshToken;
    try {
      accessToken = await createSession(user.id);
      refreshToken = generateRefreshToken(user.id);
    } catch (tokenError) {
      console.error("[Login API] 토큰 생성 에러:", tokenError);
      return NextResponse.json(
        { success: false, error: "로그인 중 오류가 발생했습니다" },
        { status: 500 }
      );
    }

    console.log("[Login API] 로그인 성공:", email);

    // 로그인 성공 기록
    await recordLoginAttempt(email, ip, userAgent, true);

    // 이전에 잠긴 계정이 있으면 자동 해제
    await resetLockOnSuccessfulLogin(user.id);

    // 토큰 만료 시간 계산
    const accessTokenExpiresIn = 24 * 60 * 60 * 1000; // 24시간 (밀리초)
    const refreshTokenExpiresIn = 7 * 24 * 60 * 60 * 1000; // 7일 (밀리초)
    const accessTokenExpiresAt = new Date(Date.now() + accessTokenExpiresIn);
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenExpiresIn);

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        userId: user.id,
        accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
        refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
        accessTokenExpiresIn: '24h',
        refreshTokenExpiresIn: '7d'
      },
      message: "로그인 성공",
    });
  } catch (error) {
    console.error("[Login API] 예상치 못한 에러:", error);
    return NextResponse.json(
      { success: false, error: "로그인 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
