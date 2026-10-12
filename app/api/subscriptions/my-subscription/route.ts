import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/subscriptions/my-subscription
 * 현재 사용자의 구독 정보 조회
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const subscription = await db.subscription.findFirst({
      where: {
        userId: user.id,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "활성 구독이 없습니다",
      });
    }

    const isActive =
      subscription.status === "active" && subscription.endDate > new Date();

    const daysRemaining = Math.ceil(
      (subscription.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({
      success: true,
      data: {
        ...subscription,
        plan: {
          ...subscription.plan,
          features: JSON.parse(subscription.plan.features),
        },
        isActive,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      },
    });
  } catch (error) {
    console.error("[My Subscription API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "구독 정보 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subscriptions/my-subscription/cancel
 * 구독 취소
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const subscription = await db.subscription.findFirst({
      where: {
        userId: user.id,
        status: "active",
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "취소할 활성 구독이 없습니다" },
        { status: 404 }
      );
    }

    const updated = await db.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
      },
      include: {
        plan: true,
      },
    });

    // 알림 생성
    await db.notification.create({
      data: {
        userId: user.id,
        type: "system",
        title: "구독이 취소되었습니다",
        body: `${updated.plan.name} 구독이 ${updated.endDate.toLocaleDateString('ko-KR')}에 만료됩니다`,
        data: JSON.stringify({
          subscriptionId: subscription.id,
          endDate: updated.endDate.toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "구독이 취소되었습니다",
    });
  } catch (error) {
    console.error("[Cancel Subscription API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "구독 취소에 실패했습니다" },
      { status: 500 }
    );
  }
}
