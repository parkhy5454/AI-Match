import { NextResponse, NextRequest } from 'next/server';
import { filterText, validateTextLength, calculateRiskScore, detectSpam } from '@/lib/textFilter';

/**
 * 텍스트 필터링 및 검증
 * POST /api/text/filter
 * 프로필, 메시지 등의 텍스트 안전성 검증
 */
export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: '요청 형식이 올바르지 않습니다' },
        { status: 400 }
      );
    }

    const { text, type = 'bio' } = body; // type: 'bio', 'message', 'report'

    if (!text) {
      return NextResponse.json(
        { success: false, error: '검증할 텍스트가 필요합니다' },
        { status: 400 }
      );
    }

    // 타입별 길이 제한
    const lengthLimits = {
      bio: { min: 10, max: 500 },
      message: { min: 1, max: 1000 },
      report: { min: 10, max: 1000 },
    };

    const limits = lengthLimits[type as keyof typeof lengthLimits] || lengthLimits.bio;

    // 1. 길이 검증
    const lengthCheck = validateTextLength(text, limits.min, limits.max);
    if (!lengthCheck.valid) {
      return NextResponse.json(
        { success: false, error: lengthCheck.message },
        { status: 400 }
      );
    }

    // 2. 텍스트 필터링
    const filterResult = filterText(text);

    // 3. 스팸 감지
    const isSpam = detectSpam(text);

    // 4. 위험도 점수 계산
    const riskScore = calculateRiskScore(text);

    console.log('[Text Filter] 검증:', {
      type,
      riskLevel: filterResult.riskLevel,
      riskScore,
      issues: filterResult.issues,
    });

    // 위험도에 따른 처리
    if (filterResult.riskLevel === 'blocked') {
      return NextResponse.json(
        {
          success: false,
          error: '부적절한 내용이 감지되었습니다',
          issues: filterResult.issues,
          riskLevel: 'blocked',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '텍스트 검증이 완료되었습니다',
      data: {
        isClean: filterResult.isClean,
        riskLevel: filterResult.riskLevel,
        riskScore, // 0-100
        issues: filterResult.issues,
        isSpam,
        recommendations: generateRecommendations(filterResult, isSpam),
      },
    });
  } catch (error) {
    console.error('[Text Filter API] 에러:', error);
    return NextResponse.json(
      { success: false, error: '텍스트 검증 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * 개선 권고사항 생성
 */
function generateRecommendations(
  filterResult: any,
  isSpam: boolean
): string[] {
  const recommendations = [];

  if (isSpam) {
    recommendations.push('같은 문자를 반복하지 않아주세요');
  }

  if (filterResult.issues.length > 0) {
    if (
      filterResult.issues.some((issue: string) => issue.includes('욕설'))
    ) {
      recommendations.push('정중한 표현을 사용해주세요');
    }

    if (
      filterResult.issues.some((issue: string) =>
        issue.includes('사기') || issue.includes('경제')
      )
    ) {
      recommendations.push('금전 거래와 관련된 표현을 피해주세요');
    }

    if (
      filterResult.issues.some((issue: string) =>
        issue.includes('휴대폰') || issue.includes('이메일')
      )
    ) {
      recommendations.push('개인 연락처 정보를 공개하지 마세요');
    }

    if (
      filterResult.issues.some((issue: string) => issue.includes('URL'))
    ) {
      recommendations.push('링크를 공유하지 마세요');
    }
  }

  return recommendations;
}
