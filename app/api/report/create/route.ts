import { NextResponse, NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import prisma from '@/lib/db';

/**
 * 사용자 신고
 * POST /api/report/create
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: '요청 형식이 올바르지 않습니다' },
        { status: 400 }
      );
    }

    const { reportedUserId, reason, description } = body;

    // 필수 필드 검증
    if (!reportedUserId || !reason) {
      return NextResponse.json(
        { success: false, error: '신고 대상과 사유를 입력해주세요' },
        { status: 400 }
      );
    }

    // 자신을 신고할 수 없음
    if (reportedUserId === user.id) {
      return NextResponse.json(
        { success: false, error: '자신을 신고할 수 없습니다' },
        { status: 400 }
      );
    }

    // 신고 사유 검증
    const validReasons = ['spam', 'inappropriate', 'scam', 'abuse'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { success: false, error: '유효한 신고 사유를 선택해주세요' },
        { status: 400 }
      );
    }

    // 신고 대상 존재 확인
    const reportedUser = await prisma.user.findUnique({
      where: { id: reportedUserId },
      select: { id: true },
    });

    if (!reportedUser) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 중복 신고 확인 (같은 사유로)
    const existingReport = await prisma.report.findUnique({
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
        { success: false, error: '이미 같은 사유로 신고한 사용자입니다' },
        { status: 400 }
      );
    }

    // 신고 생성
    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        reportedUserId,
        reason,
        description: description ? String(description).trim().slice(0, 1000) : null,
        status: 'pending',
      },
    });

    // 신고 누적 확인 (3건 이상이면 자동 정지)
    const reportCount = await prisma.report.count({
      where: {
        reportedUserId,
        status: 'pending',
      },
    });

    if (reportCount >= 3) {
      // 자동 정지 (24시간)
      await prisma.user.update({
        where: { id: reportedUserId },
        data: {
          accountStatus: 'suspended',
          suspendedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          reportCount: reportCount,
          isActive: false,
        },
      });

      console.log('[Report] 자동 정지:', reportedUserId, '신고 건수:', reportCount);
    } else {
      // 신고 건수만 증가
      await prisma.user.update({
        where: { id: reportedUserId },
        data: {
          reportCount: {
            increment: 1,
          },
        },
      });
    }

    console.log('[Report Create] 신고 생성:', report.id, 'reason:', reason);

    return NextResponse.json({
      success: true,
      data: { reportId: report.id },
      message: '신고가 접수되었습니다. 검토 후 조치하겠습니다.',
    });
  } catch (error) {
    console.error('[Report Create API] 에러:', error);
    return NextResponse.json(
      { success: false, error: '신고 접수 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
