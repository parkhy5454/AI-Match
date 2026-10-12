import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { confirmTwoFA } from "@/lib/twofa";

/**
 * POST /api/auth/2fa/verify
 * 2FA 코드 검증 및 활성화
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { secret, code } = body;

    if (!secret || !code) {
      return NextResponse.json(
        { success: false, error: "시크릿과 인증 코드가 필요합니다" },
        { status: 400 }
      );
    }

    // 코드 형식 검증 (6자리 숫자)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: "인증 코드는 6자리 숫자여야 합니다" },
        { status: 400 }
      );
    }

    const result = await confirmTwoFA(user.id, secret, code);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        backupCodes: result.backupCodes,
      },
      message: "2FA가 활성화되었습니다. 백업 코드를 안전한 곳에 보관해주세요.",
    });
  } catch (error) {
    console.error("[2FA Verify API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "2FA 검증 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
