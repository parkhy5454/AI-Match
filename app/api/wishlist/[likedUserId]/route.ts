import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * DELETE /api/wishlist/[likedUserId]
 * 위시리스트에서 제거
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { likedUserId: string } }
) {
  try {
    const user = await requireUser(req);
    const { likedUserId } = params;

    const like = await db.like.findUnique({
      where: {
        userId_likedUserId: {
          userId: user.id,
          likedUserId,
        },
      },
    });

    if (!like) {
      return NextResponse.json(
        { success: false, error: "위시리스트 항목을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    await db.like.delete({
      where: {
        userId_likedUserId: {
          userId: user.id,
          likedUserId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "위시리스트에서 제거되었습니다",
    });
  } catch (error) {
    console.error("[Wishlist Delete API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "제거에 실패했습니다" },
      { status: 500 }
    );
  }
}
