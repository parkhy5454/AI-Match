import { NextResponse } from "next/server";

/**
 * API 라우트 캐치-올 핸들러
 * 정의되지 않은 API 엔드포인트 요청 처리
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "요청한 API 엔드포인트를 찾을 수 없습니다",
      status: 404,
    },
    { status: 404 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "요청한 API 엔드포인트를 찾을 수 없습니다",
      status: 404,
    },
    { status: 404 }
  );
}
