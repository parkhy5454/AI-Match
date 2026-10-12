import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * PUT /api/messages/[messageId]
 * 메시지 읽음 확인
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const user = await requireUser(req);
    const { messageId } = params;
    const body = await req.json();
    const { isRead } = body;

    const message = await db.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: "메시지를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 수신자 확인
    if (message.senderId === user.id) {
      return NextResponse.json(
        { success: false, error: "자신의 메시지는 읽음 표시할 수 없습니다" },
        { status: 400 }
      );
    }

    const updated = await db.message.update({
      where: { id: messageId },
      data: { isRead: isRead !== false },
      include: {
        sender: {
          select: { id: true, username: true, profileImage: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "읽음 확인이 업데이트되었습니다",
    });
  } catch (error) {
    console.error("[Message Update API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "업데이트에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messages/[messageId]
 * 메시지 삭제
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const user = await requireUser(req);
    const { messageId } = params;

    const message = await db.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: "메시지를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 발신자 확인
    if (message.senderId !== user.id) {
      return NextResponse.json(
        { success: false, error: "자신의 메시지만 삭제할 수 있습니다" },
        { status: 403 }
      );
    }

    await db.message.delete({
      where: { id: messageId },
    });

    return NextResponse.json({
      success: true,
      message: "메시지가 삭제되었습니다",
    });
  } catch (error) {
    console.error("[Message Delete API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
