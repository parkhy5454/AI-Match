/**
 * MBTI 호환성 점수 계산 및 추천 로직
 * 
 * MBTI 4가지 차원:
 * - E(외향형) vs I(내향형): Extrovert vs Introvert
 * - N(직관형) vs S(감각형): iNtuitive vs Sensing  
 * - T(사고형) vs F(감정형): Thinking vs Feeling
 * - P(인식형) vs J(판단형): Perceiving vs Judging
 */

// MBTI 타입별 특성
const MBTI_TYPES = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'
];

// MBTI 각 차원별 호환성 가중치
const COMPATIBILITY_MATRIX: Record<string, Record<string, number>> = {
  // 각 MBTI 타입별 호환성 점수 (0-100)
  'ISTJ': { 'ISFJ': 90, 'ESTJ': 85, 'ISFP': 60, 'ESFJ': 80, 'ESFP': 50, 'INFJ': 75, 'INFP': 65, 'ENFJ': 70, 'ENFP': 55, 'INTJ': 80, 'INTP': 75, 'ENTP': 65, 'ISTP': 85, 'ESTP': 70, 'ESFJ': 80, 'ISFJ': 90 },
  'ISFJ': { 'ISTJ': 90, 'ESFJ': 85, 'ISFP': 80, 'INFJ': 85, 'ESTJ': 75, 'ESFP': 60, 'INFP': 75, 'ENFJ': 80, 'ENFP': 65, 'INTJ': 70, 'INTP': 70, 'ENTP': 60, 'ISTP': 70, 'ESTP': 55, 'ISTJ': 90 },
  'INFJ': { 'ENFP': 85, 'INFP': 80, 'INTJ': 85, 'ENFJ': 80, 'ENTP': 75, 'INTP': 80, 'ISFJ': 85, 'ISFP': 70, 'ESFP': 60, 'ESTP': 55, 'ESTJ': 60, 'ESFJ': 75, 'ISTJ': 70, 'ISTP': 65, 'ENFJ': 80, 'ENTJ': 70 },
  'INTJ': { 'INFJ': 85, 'INTP': 85, 'ENTJ': 80, 'ENFP': 75, 'ENTP': 85, 'INFP': 80, 'ISFJ': 70, 'ISFP': 60, 'ESFP': 50, 'ESTP': 60, 'ESFJ': 60, 'ESTJ': 75, 'ISTJ': 80, 'ISTP': 75, 'ENFJ': 70, 'ISFP': 60 },
  'ISTP': { 'ISFP': 85, 'ESTP': 85, 'ISTJ': 85, 'ENTP': 80, 'ISFJ': 70, 'INTP': 80, 'ESFP': 70, 'ESTJ': 75, 'INFP': 70, 'ENFP': 65, 'ISFJ': 70, 'ESFJ': 65, 'INTJ': 75, 'INFJ': 65, 'ENTJ': 70, 'ENFJ': 60 },
  'ISFP': { 'ISTP': 85, 'ESFP': 85, 'ISFJ': 80, 'INFP': 80, 'ESTP': 75, 'INTP': 75, 'ISTJ': 60, 'ESFJ': 80, 'ENFP': 70, 'INFJ': 70, 'ENTP': 70, 'ENTJ': 55, 'INTJ': 60, 'ESTJ': 55, 'ENFJ': 70, 'ESTP': 75 },
  'INFP': { 'ENFP': 90, 'INFJ': 80, 'INTJ': 80, 'ENFJ': 85, 'INTP': 85, 'ENTP': 80, 'ISFP': 80, 'ISFJ': 75, 'ESFP': 65, 'ESTP': 60, 'ESTJ': 50, 'ESFJ': 70, 'ISTJ': 65, 'ISTP': 70, 'ENFP': 90, 'ENTJ': 60 },
  'INTP': { 'INTJ': 85, 'INFJ': 80, 'ENTP': 85, 'INFP': 85, 'ENFP': 75, 'ISTP': 80, 'ISFP': 75, 'ENTJ': 80, 'INFP': 85, 'ENFJ': 75, 'ISFJ': 70, 'ESFP': 60, 'ESTJ': 60, 'ESFJ': 60, 'ESTP': 70, 'ISFJ': 70 },
  'ESTP': { 'ESFP': 90, 'ISTP': 85, 'ESTJ': 85, 'ESFJ': 75, 'ISFP': 75, 'ENTP': 80, 'ISFJ': 55, 'INFJ': 55, 'INFP': 60, 'INTP': 70, 'INTJ': 60, 'ENFP': 70, 'ENFJ': 70, 'ENTJ': 75, 'ISTJ': 70, 'ESFJ': 75 },
  'ESFP': { 'ESTP': 90, 'ESFJ': 85, 'ISFP': 85, 'ENFP': 85, 'ESTJ': 80, 'ISFJ': 65, 'ENTP': 70, 'INFP': 65, 'INTP': 60, 'INTJ': 50, 'INFJ': 60, 'ENFJ': 80, 'ENTJ': 70, 'ISTJ': 50, 'ISTP': 70, 'ISFJ': 65 },
  'ENFP': { 'INFP': 90, 'ENFJ': 90, 'ESFP': 85, 'INFJ': 85, 'ENTP': 85, 'INTP': 75, 'ISFP': 70, 'ENTJ': 80, 'INTJ': 75, 'ISFJ': 65, 'ESFJ': 85, 'ESTP': 70, 'ISTP': 65, 'ISTJ': 55, 'INFJ': 85, 'ESTJ': 60 },
  'ENTP': { 'INTP': 85, 'INTJ': 85, 'ENFP': 85, 'ENTP': 80, 'ENTJ': 85, 'INFP': 80, 'ENFJ': 80, 'ISTP': 80, 'ESTP': 80, 'INFJ': 75, 'ESFP': 70, 'ISFP': 70, 'ISFJ': 60, 'ESFJ': 70, 'ESTJ': 65, 'ISTJ': 65 },
  'ESTJ': { 'ISTJ': 85, 'ESTP': 85, 'ESFJ': 85, 'ISFJ': 75, 'ENTJ': 90, 'INTJ': 75, 'ISFP': 55, 'INFP': 50, 'INFJ': 60, 'ENFJ': 80, 'ENTP': 65, 'INTP': 60, 'ENFP': 60, 'ESFP': 80, 'ISTP': 75, 'ESFJ': 85 },
  'ESFJ': { 'ISFJ': 85, 'ESFP': 85, 'ESTJ': 85, 'ENFJ': 90, 'ISFP': 80, 'INFP': 70, 'INFJ': 75, 'ENFP': 85, 'ESFP': 85, 'ISTJ': 80, 'ISTP': 65, 'INTP': 60, 'INTJ': 60, 'ESTP': 75, 'ENTP': 70, 'ISFJ': 85 },
  'ENFJ': { 'INFP': 85, 'ENFP': 90, 'ESFJ': 90, 'INFJ': 80, 'ENFJ': 85, 'ENTJ': 85, 'INTP': 75, 'INTJ': 70, 'ISFP': 70, 'ESFP': 80, 'ISFJ': 80, 'ESTP': 70, 'ISTP': 60, 'ISTJ': 70, 'ESTJ': 80, 'ENTP': 80 },
  'ENTJ': { 'INTJ': 80, 'ENTJ': 85, 'ENFJ': 85, 'ESTJ': 90, 'INTP': 80, 'ENTP': 85, 'INFP': 60, 'ENFP': 80, 'ISFP': 55, 'ESFP': 70, 'ISFJ': 60, 'ESFJ': 80, 'INFJ': 70, 'ESTP': 75, 'ISTP': 70, 'ISTJ': 75 }
};

/**
 * 두 MBTI 타입 간의 호환성 점수 계산
 * @param mbti1 - 첫 번째 MBTI 타입
 * @param mbti2 - 두 번째 MBTI 타입
 * @returns 호환성 점수 (0-100)
 */
export function calculateMBTICompatibility(mbti1: string, mbti2: string): number {
  const type1 = mbti1.toUpperCase();
  const type2 = mbti2.toUpperCase();

  if (!MBTI_TYPES.includes(type1) || !MBTI_TYPES.includes(type2)) {
    return 50; // 기본값
  }

  if (type1 === type2) {
    return 100; // 같은 타입은 100점
  }

  const score = COMPATIBILITY_MATRIX[type1]?.[type2];
  return score || 50;
}

/**
 * 나이 차이에 따른 호환성 점수
 * @param userAge - 사용자 나이
 * @param targetAge - 대상 나이
 * @returns 호환성 점수 (0-100)
 */
export function calculateAgeCompatibility(userAge: number, targetAge: number): number {
  const ageDiff = Math.abs(userAge - targetAge);
  
  // 나이 차이가 2세 이하면 100점
  if (ageDiff <= 2) return 100;
  // 2-5세 차이면 90점
  if (ageDiff <= 5) return 90;
  // 5-10세 차이면 70점
  if (ageDiff <= 10) return 70;
  // 10-15세 차이면 50점
  if (ageDiff <= 15) return 50;
  // 15세 이상 차이면 30점
  return 30;
}

/**
 * 지역이 같은지에 따른 호환성 점수
 * @param region1 - 첫 번째 지역
 * @param region2 - 두 번째 지역
 * @returns 호환성 점수 (0-100)
 */
export function calculateRegionCompatibility(region1: string, region2: string): boolean {
  return region1.toLowerCase() === region2.toLowerCase();
}

/**
 * 최종 매칭 점수 계산
 * @param userMbti - 사용자 MBTI
 * @param targetMbti - 대상 MBTI
 * @param userAge - 사용자 나이
 * @param targetAge - 대상 나이
 * @param userRegion - 사용자 지역
 * @param targetRegion - 대상 지역
 * @returns 최종 호환성 점수 (0-100)
 */
export function calculateMatchScore(
  userMbti: string,
  targetMbti: string,
  userAge: number,
  targetAge: number,
  userRegion: string,
  targetRegion: string
): number {
  const mbtiScore = calculateMBTICompatibility(userMbti, targetMbti);
  const ageScore = calculateAgeCompatibility(userAge, targetAge);
  const sameRegion = calculateRegionCompatibility(userRegion, targetRegion);

  // 가중치: MBTI 40%, 나이 30%, 지역 30%
  let totalScore = mbtiScore * 0.4 + ageScore * 0.3;
  
  // 같은 지역이면 +20점, 다른 지역이면 -10점
  if (sameRegion) {
    totalScore += 20;
  } else {
    totalScore -= 10;
  }

  // 최종 점수를 0-100 범위로 조정
  return Math.max(0, Math.min(100, totalScore));
}

/**
 * MBTI 타입별 특성 설명
 */
export const MBTI_DESCRIPTIONS: Record<string, string> = {
  'ISTJ': '논리적이고 책임감 있는 실리주의자',
  'ISFJ': '따뜻하고 헌신적인 옹호자',
  'INFJ': '통찰력 있고 이상주의적인 상담가',
  'INTJ': '전략적이고 독립적인 전문가',
  'ISTP': '분석적이고 논리적인 장인',
  'ISFP': '예술적이고 감성적인 모험가',
  'INFP': '창의적이고 따뜻한 중보자',
  'INTP': '호기심 많고 혁신적인 논리학자',
  'ESTP': '활동적이고 현실적인 사업가',
  'ESFP': '사교적이고 낙관적인 연예인',
  'ENFP': '열정적이고 창의적인 캠페이너',
  'ENTP': '논쟁적이고 지략가인 토론자',
  'ESTJ': '조직적이고 결단력 있는 관리자',
  'ESFJ': '사교적이고 헌신적인 영사',
  'ENFJ': '카리스마 있고 지도력 있는 주인공',
  'ENTJ': '전략적이고 주도적인 사령관'
};

/**
 * MBTI 4차원별로 가장 호환성이 좋은 타입들
 */
export function getCompatibleMBTITypes(mbti: string): string[] {
  const type = mbti.toUpperCase();
  const matrix = COMPATIBILITY_MATRIX[type];
  
  if (!matrix) return [];

  // 호환성 점수 기준으로 정렬
  return Object.entries(matrix)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .slice(0, 5) // 상위 5개
    .map(([type]) => type);
}
