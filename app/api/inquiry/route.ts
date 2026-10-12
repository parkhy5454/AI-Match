import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { validateEmail } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const u = await getCurrentUser();

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("[Inquiry API] JSON 파싱 에러:", parseError);
      return NextResponse.json(
        { success: false, error: "요청 형식이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    // 입력값 검증
    if (!body.email || !body.subject || !body.message) {
      return NextResponse.json(
        { success: false, error: "모든 필드를 입력해주세요" },
        { status: 400 }
      );
    }

    const email = String(body.email).toLowerCase().trim();
    const subject = String(body.subject).trim();
    const message = String(body.message).trim();

    // 이메일 형식 검증
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error },
        { status: 400 }
      );
    }

    // 제목과 내용 길이 검증
    if (subject.length === 0 || subject.length > 200) {
      return NextResponse.json(
        { success: false, error: "제목은 1~200자여야 합니다" },
        { status: 400 }
      );
    }

    if (message.length === 0 || message.length > 5000) {
      return NextResponse.json(
        { success: false, error: "내용은 1~5000자여야 합니다" },
        { status: 400 }
      );
    }

    // 문의 저장
    const inquiry = await db.inquiry.create({
      data: {
        userId: u?.id,
        email,
        subject,
        message,
      },
    });

    console.log("[Inquiry API] 문의 접수:", inquiry.id);

    return NextResponse.json({
      success: true,
      data: { inquiryId: inquiry.id },
      message: "문의가 접수되었습니다",
    });
  } catch (error) {
    console.error("[Inquiry API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "문의 접수 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
