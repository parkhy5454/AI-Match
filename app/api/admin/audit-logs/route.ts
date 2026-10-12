import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePaginationParams, createPaginationMeta, formatPaginatedResponse } from "@/lib/pagination";

// 관리자 확인
async function requireAdmin(user: any) {
  const adminIds = (process.env.ADMIN_USER_IDS || "").split(",").filter(Boolean);

  if (!adminIds.includes(user.id)) {
    throw new Error("관리자 권한이 필요합니다");
  }
}

/**
 * GET /api/admin/audit-logs
 * 감시 로그 조회 (로그인 시도, 계정 변경 등)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    await requireAdmin(user);

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(req.url);
    const { skip, take } = parsePaginationParams({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });
    const type = searchParams.get("type") || "all"; // login_attempt, user_update, etc.
    const status = searchParams.get("status") || "all"; // all, success, failed

    // 필터 조건
    const whereCondition: any = {};

    if (type === "login_attempt") {
      // 로그인 시도 조회
      if (status === "success") {
        whereCondition.success = true;
      } else if (status === "failed") {
        whereCondition.success = false;
      }

      const total = await db.loginAttempt.count({ where: whereCondition });

      const logs = await db.loginAttempt.findMany({
        where: whereCondition,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      });

      const page = Math.max(1, parseInt(String(searchParams.get("page") || 1)));
      const limit = Math.min(100, Math.max(1, parseInt(String(searchParams.get("limit") || 20))));
      const meta = createPaginationMeta(page, limit, total);

      const response = formatPaginatedResponse(
        logs.map((log) => ({
          id: log.id,
          email: log.email,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          success: log.success,
          reason: log.reason,
          createdAt: log.createdAt,
          type: "login_attempt",
        })),
        meta
      );

      return NextResponse.json({
        success: true,
        data: response.data,
        meta: response.meta,
      });
    } else {
      // 모든 로그 타입 조회
      const loginLogs = await db.loginAttempt.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
      });

      const page = Math.max(1, parseInt(String(searchParams.get("page") || 1)));
      const limit = Math.min(100, Math.max(1, parseInt(String(searchParams.get("limit") || 20))));
      const total = await db.loginAttempt.count();
      const meta = createPaginationMeta(page, limit, total);

      const allLogs = loginLogs.map((log) => ({
        id: log.id,
        email: log.email,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        success: log.success,
        reason: log.reason,
        createdAt: log.createdAt,
        type: "login_attempt",
      }));

      const response = formatPaginatedResponse(allLogs, meta);

      return NextResponse.json({
        success: true,
        data: response.data,
        meta: response.meta,
      });
    }
  } catch (error) {
    console.error("[Audit Logs API] GET 에러:", error);

    if (error instanceof Error && error.message.includes("관리자")) {
      return NextResponse.json(
        { success: false, error: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: "감시 로그 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}
