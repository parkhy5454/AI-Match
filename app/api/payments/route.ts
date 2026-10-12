import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePaginationParams, createPaginationMeta, formatPaginatedResponse } from "@/lib/pagination";

/**
 * GET /api/payments
 * 사용자의 결제 이력 조회
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const { searchParams } = new URL(req.url);
    const { skip, take } = parsePaginationParams({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    const total = await db.payment.count({
      where: { userId: user.id },
    });

    const payments = await db.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    const page = Math.max(1, parseInt(String(searchParams.get("page") || 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(searchParams.get("limit") || 20))));
    const meta = createPaginationMeta(page, limit, total);

    const response = formatPaginatedResponse(payments, meta);

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    });
  } catch (error) {
    console.error("[Payments API] GET 에러:", error);
    return NextResponse.json(
      { success: false, error: "결제 이력 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments
 * 결제 생성
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();

    const { amount, paymentMethod, reason, relatedId } = body;

    if (!amount || !paymentMethod || !reason) {
      return NextResponse.json(
        { success: false, error: "필수 필드가 없습니다" },
        { status: 400 }
      );
    }

    // 결제 생성
    const payment = await db.payment.create({
      data: {
        userId: user.id,
        amount,
        paymentMethod,
        reason,
        relatedId: relatedId || null,
        status: "pending",
      },
    });

    // 실제 결제 게이트웨이 연동 (여기서는 시뮬레이션)
    // 결제 성공 처리
    const updatedPayment = await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "completed",
        transactionId: `TXN-${Date.now()}`,
        completedAt: new Date(),
      },
    });

    // 포인트 추가 (결제 성공 시)
    if (reason === "points") {
      await db.user.update({
        where: { id: user.id },
        data: { points: { increment: amount } },
      });

      await db.pointHistory.create({
        data: {
          userId: user.id,
          amount,
          reason: "payment",
          relatedId: payment.id,
        },
      });
    }

    // 알림 생성
    await db.notification.create({
      data: {
        userId: user.id,
        type: "system",
        title: "결제가 완료되었습니다",
        body: `₩${amount.toLocaleString()} 결제가 완료되었습니다`,
        data: JSON.stringify({
          paymentId: payment.id,
          amount,
          reason,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedPayment,
      message: "결제가 완료되었습니다",
    });
  } catch (error) {
    console.error("[Payments API] POST 에러:", error);
    return NextResponse.json(
      { success: false, error: "결제 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
