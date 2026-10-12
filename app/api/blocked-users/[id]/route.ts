import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteCachePattern } from "@/lib/cache";

/**
 * DELETE /api/blocked-users/[id]
 * 사용자 차단 해제
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser(req);
    const { id } = params;

    // 차단 기록이 존재하는지 확인
    const block = await db.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: user.id,
          blockedId: id,
        },
      },
    });

    if (!block) {
      return NextResponse.json(
        { success: false, error: "차단 기록을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 차단 해제
    await db.blockedUser.delete({
      where: {
        blockerId_blockedId: {
          blockerId: user.id,
          blockedId: id,
        },
      },
    });

    // 캐시 무효화
    deleteCachePattern(`blocked-users:${user.id}:*`);
    deleteCachePattern(`search:${user.id}:*`);
    deleteCachePattern(`recommendations:${user.id}:*`);

    console.log("[Blocked Users API] 차단 해제됨:", id);

    return NextResponse.json(
      { success: true, message: "차단이 해제되었습니다" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Blocked Users API] 차단 해제 에러:", error);
    return NextResponse.json(
      { success: false, error: "차단 해제 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
