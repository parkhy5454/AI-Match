import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { disableTwoFA } from "@/lib/twofa";

/**
 * POST /api/auth/2fa/disable
 * 2FA 비활성화
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: "비밀번호가 필요합니다" },
        { status: 400 }
      );
    }

    // TODO: 비밀번호 검증 추가

    const result = await disableTwoFA(user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "2FA가 비활성화되었습니다.",
    });
  } catch (error) {
    console.error("[2FA Disable API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "2FA 비활성화 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
