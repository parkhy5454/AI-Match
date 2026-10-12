import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getAllEndpointStats,
  getPerformanceSummary,
  getRecentMetrics,
  getSlowRequests,
  getErrorRequests,
} from "@/lib/performanceLogger";

/**
 * GET /api/performance
 * 성능 모니터링 대시보드 데이터 (관리자용)
 */
export async function GET(req: NextRequest) {
  try {
    // 인증 확인 (관리자 역할 확인 필요)
    const user = await requireUser(req);

    // 쿼리 파라미터
    const searchParams = req.nextUrl.searchParams;
    const dataType = searchParams.get("type") || "summary";
    const limit = parseInt(searchParams.get("limit") || "50");

    let data;

    switch (dataType) {
      case "summary":
        data = getPerformanceSummary();
        break;
      case "endpoints":
        data = getAllEndpointStats();
        break;
      case "recent":
        data = getRecentMetrics(limit);
        break;
      case "slow":
        data = getSlowRequests(1000, limit);
        break;
      case "errors":
        data = getErrorRequests(limit);
        break;
      default:
        data = getPerformanceSummary();
    }

    return NextResponse.json({
      success: true,
      data,
      type: dataType,
      message: "성능 데이터 조회 성공",
    });
  } catch (error) {
    console.error("[Performance API] 에러:", error);
    return NextResponse.json(
      { success: false, error: "성능 데이터 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
