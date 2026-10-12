import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * DELETE /api/blocked-users/[blockedUserId]
 * 사용자 차단 해제
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { blockedUserId: string } }
) {
  try {
    const user = await requireUser(req);
    const { blockedUserId } = params;

    const blocked = await db.blockedUser.findUnique({
      where: {
        userId_blockedUserId: {
          userId: user.id,
          blockedUserId,
        },
      },
      include: {
        blockedUser: {
          select: { username: true },
        },
      },
    });

    if (!blocked) {
      return NextResponse.json(
        { success: false, error: "차단 기록을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    await db.blockedUser.delete({
      where: {
        userId_blockedUserId: {
          userId: user.id,
          blockedUserId,
        },
      },
    });

    // 알림 생성
    await db.notification.create({
      data: {
        userId: user.id,
        type: "system",
        title: "사용자 차단이 해제되었습니다",
        body: `${blocked.blockedUser.username}의 차단을 해제했습니다`,
        data: JSON.stringify({
          blockedUserId,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "사용자 차단이 해제되었습니다",
    });
  } catch (error) {
    console.error("[Blocked Users Delete API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "차단 해제에 실패했습니다" },
      { status: 500 }
    );
  }
}
