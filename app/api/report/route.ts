import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePaginationParams, createPaginationMeta, formatPaginatedResponse } from "@/lib/pagination";

/**
 * GET /api/report
 * 사용자가 제출한 신고 조회
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(req.url);
    const { skip, take } = parsePaginationParams({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    // 전체 신고 개수
    const total = await db.report.count({
      where: { reporterId: user.id },
    });

    // 신고 목록
    const reports = await db.report.findMany({
      where: { reporterId: user.id },
      include: {
        reportedUser: {
          select: {
            id: true,
            username: true,
            email: true,
            profileImage: true,
            region: true,
            mbti: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    const page = Math.max(1, parseInt(String(searchParams.get("page") || 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(searchParams.get("limit") || 20))));
    const meta = createPaginationMeta(page, limit, total);

    const response = formatPaginatedResponse(
      reports.map((r) => ({
        id: r.id,
        reportedUser: r.reportedUser,
        reason: r.reason,
        description: r.description,
        status: r.status,
        action: r.action,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      meta
    );

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
    });
  } catch (error) {
    console.error("[Report API] GET 에러:", error);
    return NextResponse.json(
      { success: false, error: "신고 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/report
 * 사용자 신고 제출
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { reportedUserId, reason, description } = body;

    // 검증
    if (!reportedUserId) {
      return NextResponse.json(
        { success: false, error: "신고할 사용자가 필요합니다" },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { success: false, error: "신고 사유가 필요합니다" },
        { status: 400 }
      );
    }

    // 유효한 신고 사유 확인
    const validReasons = ["spam", "inappropriate", "scam", "abuse", "other"];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 신고 사유입니다" },
        { status: 400 }
      );
    }

    // 자신을 신고하는 것 방지
    if (user.id === reportedUserId) {
      return NextResponse.json(
        { success: false, error: "자신을 신고할 수 없습니다" },
        { status: 400 }
      );
    }

    // 신고된 사용자 존재 확인
    const reportedUser = await db.user.findUnique({
      where: { id: reportedUserId },
    });

    if (!reportedUser) {
      return NextResponse.json(
        { success: false, error: "신고할 사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 중복 신고 확인 (같은 사유로 이미 신고했는지)
    const existingReport = await db.report.findUnique({
      where: {
        reporterId_reportedUserId_reason: {
          reporterId: user.id,
          reportedUserId,
          reason,
        },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { success: false, error: "이미 같은 사유로 신고하셨습니다" },
        { status: 400 }
      );
    }

    console.log("[Report API] 신고 접수 -", user.id, "->", reportedUserId);

    // 신고 저장
    const report = await db.report.create({
      data: {
        reporterId: user.id,
        reportedUserId,
        reason,
        description: description || null,
        status: "pending",
      },
      include: {
        reportedUser: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // 신고 대상 사용자의 신고 횟수 업데이트
    const reportCount = await db.report.count({
      where: { reportedUserId },
    });

    await db.user.update({
      where: { id: reportedUserId },
      data: { reportCount },
    });

    console.log("[Report API] 신고 저장 완료:", report.id);

    // 신고 횟수가 5회 이상이면 계정 정지 검토
    if (reportCount >= 5) {
      console.log("[Report API] 신고 횟수가 5회 이상, 계정 정지 검토 필요:", reportedUserId);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: report.id,
        status: report.status,
      },
      message: "신고가 정상적으로 접수되었습니다. 검토 후 조치하겠습니다.",
    });
  } catch (error) {
    console.error("[Report API] POST 에러:", error);
    return NextResponse.json(
      { success: false, error: "신고 접수 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
