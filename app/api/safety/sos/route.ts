import { NextResponse, NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import prisma from '@/lib/db';

/**
 * SOS 신호 전송
 * POST /api/safety/sos
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

    const { location, emergency_contact, reason } = body;

    if (!location) {
      return NextResponse.json(
        { success: false, error: '위치 정보가 필요합니다' },
        { status: 400 }
      );
    }

    // SOS 기록 생성
    const sos = await prisma.sosAlert.create({
      data: {
        userId: user.id,
        latitude: location.latitude,
        longitude: location.longitude,
        reason: reason || '도움이 필요합니다',
        emergencyContact: emergency_contact,
        status: 'active',
        createdAt: new Date(),
      },
    });

    // 관리자에게 알림 (실제로는 푸시 알림 또는 이메일)
    console.log('[SOS Alert] 긴급 신호:', user.id, '위치:', location, '연락처:', emergency_contact);

    // 신뢰할 수 있는 친구들에게 공유 (향후 구현)
    // await notifyTrustedFriends(user.id, sos);

    return NextResponse.json({
      success: true,
      data: {
        sosId: sos.id,
        status: sos.status,
      },
      message: '긴급 신호가 전송되었습니다. 도움을 요청하고 있습니다.',
    });
  } catch (error) {
    console.error('[SOS Alert API] 에러:', error);
    return NextResponse.json(
      { success: false, error: 'SOS 신호 전송 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * SOS 신호 취소
 * DELETE /api/safety/sos/:sosId
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const sosId = req.nextUrl.pathname.split('/').pop();

    if (!sosId) {
      return NextResponse.json(
        { success: false, error: 'SOS ID가 필요합니다' },
        { status: 400 }
      );
    }

    // SOS 소유권 확인
    const sos = await prisma.sosAlert.findUnique({
      where: { id: sosId },
    });

    if (!sos || sos.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'SOS 신호를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // SOS 취소
    await prisma.sosAlert.update({
      where: { id: sosId },
      data: { status: 'resolved', resolvedAt: new Date() },
    });

    console.log('[SOS Resolved] 신호 취소:', user.id, sosId);

    return NextResponse.json({
      success: true,
      message: '긴급 신호가 취소되었습니다',
    });
  } catch (error) {
    console.error('[SOS Cancel API] 에러:', error);
    return NextResponse.json(
      { success: false, error: 'SOS 신호 취소 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
