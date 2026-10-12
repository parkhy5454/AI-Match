import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { verifyResetToken } from "@/lib/auth";
import { validatePassword } from "@/lib/validation";

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

    let { token, newPassword, confirmPassword } = body;

    if (!token || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: "필수 정보를 입력해주세요" },
        { status: 400 }
      );
    }

    // 비밀번호 trim 처리
    newPassword = String(newPassword).trim();
    confirmPassword = String(confirmPassword).trim();

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "비밀번호가 일치하지 않습니다" },
        { status: 400 }
      );
    }

    // 비밀번호 검증
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.error },
        { status: 400 }
      );
    }

    console.log("[Reset Password API] 비밀번호 리셋 시도");

    // 토큰 검증
    const decoded = verifyResetToken(token);
    if (!decoded || !decoded.email) {
      console.log("[Reset Password API] 유효하지 않은 토큰");
      return NextResponse.json(
        { success: false, error: "유효하지 않은 또는 만료된 링크입니다" },
        { status: 400 }
      );
    }

    const email = String(decoded.email).toLowerCase().trim();
    console.log("[Reset Password API] 토큰 검증 완료:", email);

    // 사용자 확인
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      console.log("[Reset Password API] 사용자 없음:", email);
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log("[Reset Password API] 비밀번호 변경 완료:", email);

    return NextResponse.json({
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다",
    });
  } catch (error) {
    console.error("[Reset Password API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "비밀번호 변경 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
