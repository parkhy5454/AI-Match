import { NextResponse, NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';

/**
 * 안전 팁 및 데이트 안전 가이드
 * GET /api/safety/tips
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser(req);

    const safetyTips = [
      {
        id: 1,
        category: '만남 전',
        title: '신원 확인',
        description: '상대방의 프로필이 실제인지 확인하세요. 사진을 역 이미지 검색으로 확인하거나 SNS 계정을 확인하세요.',
        icon: '🔍',
      },
      {
        id: 2,
        category: '만남 전',
        title: '친구에게 알리기',
        description: '만날 장소, 시간, 상대방 정보를 신뢰할 수 있는 친구에게 미리 알려두세요.',
        icon: '👥',
      },
      {
        id: 3,
        category: '만남 전',
        title: '공개된 장소 선택',
        description: '처음 만날 때는 카페, 식당 등 사람이 많은 공개된 장소를 선택하세요.',
        icon: '📍',
      },
      {
        id: 4,
        category: '만남 전',
        title: '개인정보 보호',
        description: '집 주소, 직장 주소, 휴대폰 번호 등 개인정보는 충분히 신뢰한 후 공유하세요.',
        icon: '🔐',
      },
      {
        id: 5,
        category: '만남 중',
        title: '자주 체크인',
        description: '친구에게 정기적으로 연락을 하여 안전함을 알려주세요.',
        icon: '📞',
      },
      {
        id: 6,
        category: '만남 중',
        title: '음료 주의',
        description: '자신이 준비한 음료만 마시고, 화장실에 갈 때 음료를 혼자 두지 마세요.',
        icon: '🥤',
      },
      {
        id: 7,
        category: '만남 중',
        title: '직감 신뢰',
        description: '이상한 느낌이 들면 언제든 만남을 중단하고 떠날 수 있습니다.',
        icon: '⚠️',
      },
      {
        id: 8,
        category: '만남 후',
        title: '피드백 공유',
        description: '앱에서 피드백을 남겨서 커뮤니티를 더 안전하게 만들 수 있습니다.',
        icon: '⭐',
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        tips: safetyTips,
        emergency: {
          police: '112',
          women_hotline: '1366',
          sos_app: '앱 내 SOS 기능 사용',
        },
      },
      message: '안전 팁을 확인하세요',
    });
  } catch (error) {
    console.error('[Safety Tips API] 에러:', error);
    return NextResponse.json(
      { success: false, error: '안전 팁 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
