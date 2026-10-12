import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/search-preferences
 * 검색 설정 조회
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const preference = await db.searchPreference.findUnique({
      where: { userId: user.id },
    });

    if (!preference) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "검색 설정이 없습니다",
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...preference,
        preferredMbti: preference.preferredMbti ? JSON.parse(preference.preferredMbti) : null,
      },
    });
  } catch (error) {
    console.error("[Search Preferences API] GET 에러:", error);
    return NextResponse.json(
      { success: false, error: "검색 설정 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/search-preferences
 * 검색 설정 저장/수정
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();

    const {
      minAge,
      maxAge,
      preferredRegion,
      preferredMbti,
      minHeight,
      maxHeight,
    } = body;

    // 기존 설정 확인
    const existing = await db.searchPreference.findUnique({
      where: { userId: user.id },
    });

    let preference;

    if (existing) {
      // 수정
      preference = await db.searchPreference.update({
        where: { userId: user.id },
        data: {
          minAge,
          maxAge,
          preferredRegion,
          preferredMbti: preferredMbti ? JSON.stringify(preferredMbti) : null,
          minHeight,
          maxHeight,
        },
      });
    } else {
      // 생성
      preference = await db.searchPreference.create({
        data: {
          userId: user.id,
          minAge,
          maxAge,
          preferredRegion,
          preferredMbti: preferredMbti ? JSON.stringify(preferredMbti) : null,
          minHeight,
          maxHeight,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...preference,
        preferredMbti: preference.preferredMbti ? JSON.parse(preference.preferredMbti) : null,
      },
      message: "검색 설정이 저장되었습니다",
    });
  } catch (error) {
    console.error("[Search Preferences API] PUT 에러:", error);
    return NextResponse.json(
      { success: false, error: "검색 설정 저장에 실패했습니다" },
      { status: 500 }
    );
  }
}
