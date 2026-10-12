import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { enableTwoFA } from "@/lib/twofa";

/**
 * POST /api/auth/2fa/setup
 * 2FA 설정 시작 (시크릿 키 및 QR 코드 생성)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const result = await enableTwoFA(user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        secret: result.secret,
        qrCodeUrl: result.qrCodeUrl,
      },
      message: "2FA 설정이 준비되었습니다. 인증 앱으로 QR 코드를 스캔해주세요.",
    });
  } catch (error) {
    console.error("[2FA Setup API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "2FA 설정 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
