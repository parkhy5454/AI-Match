import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, generateRefreshToken } from "@/lib/auth";
import { validateEmail, validatePassword, validateUsername } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimiter";

/**
 * POST /api/register
 * 회원가입
 *
 * 변경사항:
 * - Rate limiting 추가 (IP당 1시간 5회)
 * - 응답 형식 표준화 (success 필드 추가)
 * - username 필드명 통일 (name → username)
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting - IP당 1시간에 5회 가입 시도 제한
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimitKey = `register:${ip}`;
    const rateLimit = checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000);

    if (!rateLimit.allowed) {
      console.log("[Register API] Rate limit 초과:", ip);
      return NextResponse.json(
        { success: false, error: "너무 많은 가입 시도가 있었습니다. 나중에 다시 시도해주세요." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("[Register API] JSON 파싱 에러:", parseError);
      return NextResponse.json(
        { success: false, error: "요청 형식이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    let { email, password, confirmPassword, username, gender, referralCode } = body;

    // 필수 필드 검증
    if (!email || !password || !username) {
      console.log("[Register API] 필수 필드 누락:", { email: !!email, password: !!password, username: !!username });
      return NextResponse.json(
        { success: false, error: "모든 필드를 입력해주세요" },
        { status: 400 }
      );
    }

    // 비밀번호 trim 처리
    password = String(password).trim();
    // confirmPassword가 없으면 password와 동일하게 처리
    confirmPassword = String(confirmPassword || password).trim();

    console.log("[Register API] 회원가입 시도:", {
      email: String(email).toLowerCase(),
      usernameLength: String(username).length,
      passwordLength: password.length,
      gender: gender || 'not_provided'
    });

    // 이메일 검증
    const emailValidation = validateEmail(String(email).toLowerCase());
    if (!emailValidation.valid) {
      console.log("[Register API] 이메일 검증 실패:", emailValidation.error);
      return NextResponse.json(
        { success: false, error: emailValidation.error },
        { status: 400 }
      );
    }

    // 비밀번호 검증
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.log("[Register API] 비밀번호 검증 실패:", passwordValidation.error);
      return NextResponse.json(
        { success: false, error: passwordValidation.error },
        { status: 400 }
      );
    }

    // 비밀번호 확인 일치
    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "비밀번호가 일치하지 않습니다" },
        { status: 400 }
      );
    }

    // 사용자명 검증
    const usernameValidation = validateUsername(String(username));
    if (!usernameValidation.valid) {
      return NextResponse.json(
        { success: false, error: usernameValidation.error },
        { status: 400 }
      );
    }

    // 중복 확인
    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "이미 가입된 이메일입니다" },
        { status: 400 }
      );
    }

    // 사용자명 중복 확인
    const existingUsername = await db.user.findFirst({
      where: { username: String(username).toLowerCase() },
    });

    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: "이미 사용 중인 사용자명입니다" },
        { status: 400 }
      );
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        username: String(username).toLowerCase(),
        gender: gender || null,
        age: 0,
        region: "",
        mbti: "",
      },
    });

    // 토큰 생성 (액세스 토큰 + 리프레시 토큰)
    const accessToken = await createSession(user.id);
    const refreshToken = generateRefreshToken(user.id);

    console.log("[Register API] 회원가입 성공:", user.id);

    // 토큰 만료 시간 계산
    const accessTokenExpiresIn = 24 * 60 * 60 * 1000; // 24시간 (밀리초)
    const refreshTokenExpiresIn = 7 * 24 * 60 * 60 * 1000; // 7일 (밀리초)
    const accessTokenExpiresAt = new Date(Date.now() + accessTokenExpiresIn);
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenExpiresIn);

    return NextResponse.json(
      {
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
        message: "회원가입 성공",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Register API] 예상치 못한 에러:", error);
    return NextResponse.json(
      { success: false, error: "회원가입 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
