import { NextResponse, NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import prisma from '@/lib/db';

/**
 * 사용자 온라인 상태 업데이트 및 조회
 * POST /api/user/status (상태 업데이트)
 * GET /api/user/status (상태 조회)
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

    const { status = 'online' } = body;

    if (!['online', 'away', 'offline'].includes(status)) {
      return NextResponse.json(
        { success: false, error: '유효한 상태가 아닙니다 (online, away, offline)' },
        { status: 400 }
      );
    }

    // 사용자 상태 업데이트
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        onlineStatus: status,
        lastActiveAt: new Date(),
      },
      select: {
        id: true,
        onlineStatus: true,
        lastActiveAt: true,
      },
    });

    console.log('[User Status] 업데이트:', user.id, '상태:', status);

    return NextResponse.json({
      success: true,
      data: updated,
      message: `상태가 ${getStatusLabel(status)}(으)로 변경되었습니다`,
    });
  } catch (error) {
    console.error('[User Status API] 에러:', error);
    return NextResponse.json(
      { success: false, error: '상태 업데이트 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다' },
        { status: 400 }
      );
    }

    // 차단 확인
    const isBlocked = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: user.id,
        },
      },
    });

    // 차단된 경우 상태 숨기기
    if (isBlocked) {
      return NextResponse.json({
        success: true,
        data: {
          userId,
          onlineStatus: 'hidden',
          lastActiveAt: null,
        },
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        onlineStatus: true,
        lastActiveAt: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 마지막 활동이 5분 이상 전이면 away로 표시
    const timeDiff = Date.now() - (targetUser.lastActiveAt?.getTime() || 0);
    const displayStatus =
      targetUser.onlineStatus === 'online' && timeDiff > 5 * 60 * 1000
        ? 'away'
        : targetUser.onlineStatus;

    return NextResponse.json({
      success: true,
      data: {
        ...targetUser,
        onlineStatus: displayStatus,
        lastSeenAgo: getLastSeenAgo(targetUser.lastActiveAt),
      },
    });
  } catch (error) {
    console.error('[User Status GET] 에러:', error);
    return NextResponse.json(
      { success: false, error: '상태 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * 상태를 한국어로 변환
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    online: '온라인',
    away: '자리비움',
    offline: '오프라인',
  };
  return labels[status] || status;
}

/**
 * 마지막 활동 시간을 상대적으로 표현
 */
function getLastSeenAgo(date: Date | null): string {
  if (!date) return '정보 없음';

  const now = Date.now();
  const diff = now - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return '1주일 이상 전';
}
