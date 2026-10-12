import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * 사용자 계정 삭제 (GDPR 준수)
 * DELETE /api/auth/delete-account
 * 요청 본문: { password: string, confirm: true }
 */
export async function DELETE(req: NextRequest) {
  try {
    // 인증 확인
    const user = await requireUser(req);

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: "요청 형식이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    const { password, confirm } = body;

    // 확인 필드 검증
    if (!confirm) {
      return NextResponse.json(
        { error: "계정 삭제를 확인해주세요" },
        { status: 400 }
      );
    }

    // 비밀번호 입력 확인
    if (!password) {
      return NextResponse.json(
        { error: "비밀번호를 입력해주세요" },
        { status: 400 }
      );
    }

    // 현재 사용자의 비밀번호 확인
    const currentUser = await db.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, currentUser.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다" },
        { status: 401 }
      );
    }

    // 사용자 계정 삭제 (관련 데이터도 CASCADE로 삭제됨)
    await db.user.delete({
      where: { id: user.id },
    });

    console.log("[Delete Account API] 계정 삭제 완료:", user.id);

    return NextResponse.json({
      success: true,
      message: "계정이 삭제되었습니다",
    });
  } catch (error) {
    console.error("[Delete Account API] 에러:", error);
    return NextResponse.json(
      { error: "계정 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
