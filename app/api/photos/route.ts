import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/photos
 * 사용자의 사진 갤러리 조회
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || user.id;

    const photos = await db.userPhoto.findMany({
      where: { userId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: photos,
    });
  } catch (error) {
    console.error("[Photos API] GET 에러:", error);
    return NextResponse.json(
      { success: false, error: "사진 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/photos
 * 사진 업로드
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();

    const { photoUrl, isMain } = body;

    if (!photoUrl) {
      return NextResponse.json(
        { success: false, error: "사진 URL이 필요합니다" },
        { status: 400 }
      );
    }

    // 메인 사진으로 설정하면 기존 메인 사진 해제
    if (isMain) {
      await db.userPhoto.updateMany({
        where: { userId: user.id, isMain: true },
        data: { isMain: false },
      });
    }

    // 기존 사진 개수
    const count = await db.userPhoto.count({
      where: { userId: user.id },
    });

    const photo = await db.userPhoto.create({
      data: {
        userId: user.id,
        photoUrl,
        order: count,
        isMain: isMain || count === 0, // 첫 번째 사진은 메인
      },
    });

    return NextResponse.json({
      success: true,
      data: photo,
      message: "사진이 업로드되었습니다",
    });
  } catch (error) {
    console.error("[Photos API] POST 에러:", error);
    return NextResponse.json(
      { success: false, error: "사진 업로드에 실패했습니다" },
      { status: 500 }
    );
  }
}
