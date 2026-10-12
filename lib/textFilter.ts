/**
 * 텍스트 필터링 유틸리티
 * 욕설, 비속어, 사기 키워드 감지
 */

// 금지된 키워드 목록
const BANNED_KEYWORDS = [
  '신용카드',
  '계좌이체',
  '송금',
  '돈',
  '현금',
  '은행',
  '대출',
  '투자',
  '암호화폐',
  '비트코인',
];

const PROFANITY_KEYWORDS = [
  '욕설',
  '비속어',
  '욕하',
  '개자식',
  '병신',
  '미친',
  '뒤져',
];

const SCAM_KEYWORDS = [
  '돈벌기',
  '쉬운돈',
  '빠른돈',
  '고수익',
  '투자수익',
  '보장',
  '보증',
  '거래',
  '실명',
  '서류',
];

interface TextFilterResult {
  isClean: boolean;
  issues: string[];
  riskLevel: 'safe' | 'warning' | 'blocked';
  filteredText: string;
}

/**
 * 텍스트 필터링 (욕설, 사기 키워드)
 * @param text - 검증할 텍스트
 */
export function filterText(text: string): TextFilterResult {
  if (!text || text.length === 0) {
    return {
      isClean: true,
      issues: [],
      riskLevel: 'safe',
      filteredText: text,
    };
  }

  const lowerText = text.toLowerCase();
  const issues: string[] = [];
  let riskLevel: 'safe' | 'warning' | 'blocked' = 'safe';

  // 1. 욕설 감지
  for (const keyword of PROFANITY_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      issues.push(`욕설 감지: "${keyword}"`);
      riskLevel = 'blocked';
    }
  }

  // 2. 사기 키워드 감지
  let scamCount = 0;
  for (const keyword of SCAM_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      scamCount++;
    }
  }

  if (scamCount >= 2) {
    issues.push(`사기 의심 키워드 ${scamCount}개 감지`);
    riskLevel = 'blocked';
  } else if (scamCount === 1) {
    issues.push('주의: 경제적 제안 포함');
    if (riskLevel !== 'blocked') riskLevel = 'warning';
  }

  // 3. 금지 키워드 감지 (금융 거래 관련)
  for (const keyword of BANNED_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      issues.push(`금지 키워드: "${keyword}"`);
      riskLevel = 'blocked';
    }
  }

  // 4. URL 감지
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  if (urlRegex.test(text)) {
    issues.push('URL 링크 감지');
    if (riskLevel !== 'blocked') riskLevel = 'warning';
  }

  // 5. 개인정보 감지 (휴대폰, 이메일)
  const phoneRegex = /(\d{3}-\d{4}-\d{4}|\d{10,11})/;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

  if (phoneRegex.test(text)) {
    issues.push('휴대폰 번호 감지');
    if (riskLevel !== 'blocked') riskLevel = 'warning';
  }

  if (emailRegex.test(text)) {
    issues.push('이메일 주소 감지');
    if (riskLevel !== 'blocked') riskLevel = 'warning';
  }

  return {
    isClean: issues.length === 0,
    issues,
    riskLevel,
    filteredText: text,
  };
}

/**
 * 비속어 마스킹 (욕설 → ***)
 */
export function maskProfanity(text: string): string {
  let masked = text;

  for (const keyword of PROFANITY_KEYWORDS) {
    const regex = new RegExp(keyword, 'gi');
    masked = masked.replace(regex, '*'.repeat(keyword.length));
  }

  return masked;
}

/**
 * 위험도 점수 계산 (0-100)
 */
export function calculateRiskScore(text: string): number {
  const result = filterText(text);

  let score = 0;

  // 위험도 기본 점수
  if (result.riskLevel === 'blocked') {
    score = 100;
  } else if (result.riskLevel === 'warning') {
    score = 50;
  }

  // 이슈 개수에 따른 가산점
  score += result.issues.length * 10;

  return Math.min(score, 100);
}

/**
 * 텍스트 길이 검증
 */
export function validateTextLength(
  text: string,
  minLength = 5,
  maxLength = 500
): { valid: boolean; message: string } {
  if (text.length < minLength) {
    return {
      valid: false,
      message: `최소 ${minLength}자 이상이어야 합니다 (현재: ${text.length}자)`,
    };
  }

  if (text.length > maxLength) {
    return {
      valid: false,
      message: `최대 ${maxLength}자 이하여야 합니다 (현재: ${text.length}자)`,
    };
  }

  return { valid: true, message: '문자 길이 확인됨' };
}

/**
 * 스팸 감지 (반복 문자)
 */
export function detectSpam(text: string): boolean {
  // 같은 문자 3개 이상 반복
  const repeatRegex = /(.)\1{2,}/;
  return repeatRegex.test(text);
}
