/**
 * 비밀번호 정책 검증 유틸리티
 *
 * 정책:
 * - 최소 8자 이상
 * - 대문자 포함 (A-Z)
 * - 소문자 포함 (a-z)
 * - 숫자 포함 (0-9)
 * - 특수문자 포함 (@$!%*?&)
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /\d/,
  hasSpecialChar: /[@$!%*?&]/,
};

const SPECIAL_CHARS = '@$!%*?&#-_+=';

/**
 * 비밀번호 검증
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // 길이 검증
  if (!password || password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`비밀번호는 최소 ${PASSWORD_REQUIREMENTS.minLength}자 이상이어야 합니다.`);
  }

  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`비밀번호는 최대 ${PASSWORD_REQUIREMENTS.maxLength}자 이하여야 합니다.`);
  }

  // 대문자 검증
  if (!PASSWORD_REQUIREMENTS.hasUppercase.test(password)) {
    errors.push('대문자(A-Z)를 최소 하나 포함해야 합니다.');
  }

  // 소문자 검증
  if (!PASSWORD_REQUIREMENTS.hasLowercase.test(password)) {
    errors.push('소문자(a-z)를 최소 하나 포함해야 합니다.');
  }

  // 숫자 검증
  if (!PASSWORD_REQUIREMENTS.hasNumber.test(password)) {
    errors.push('숫자(0-9)를 최소 하나 포함해야 합니다.');
  }

  // 특수문자 검증
  if (!PASSWORD_REQUIREMENTS.hasSpecialChar.test(password)) {
    errors.push(`특수문자(${SPECIAL_CHARS})를 최소 하나 포함해야 합니다.`);
  }

  // 강도 계산
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  if (errors.length === 0) {
    if (password.length >= 12) {
      strength = 'strong';
    } else if (password.length >= 10) {
      strength = 'good';
    } else {
      strength = 'fair';
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * 비밀번호 강도 표시
 */
export function getPasswordStrengthLabel(strength: string): string {
  const labels: Record<string, string> = {
    weak: '약함 ❌',
    fair: '보통 ⚠️',
    good: '좋음 ✅',
    strong: '매우 강함 🔒',
  };
  return labels[strength] || '알 수 없음';
}

/**
 * 비밀번호 강도 색상
 */
export function getPasswordStrengthColor(strength: string): string {
  const colors: Record<string, string> = {
    weak: '#ff6b6b',      // 빨강
    fair: '#ffa94d',      // 주황
    good: '#51cf66',      // 초록
    strong: '#2f9e44',    // 진한 초록
  };
  return colors[strength] || '#999';
}

/**
 * 권장 비밀번호 예시
 */
export function getPasswordExample(): string {
  return 'Example: MyPass123!@#';
}

/**
 * 비밀번호 요구사항 가이드
 */
export function getPasswordRequirements(): string[] {
  return [
    `최소 ${PASSWORD_REQUIREMENTS.minLength}자 이상`,
    '대문자(A-Z) 포함',
    '소문자(a-z) 포함',
    '숫자(0-9) 포함',
    `특수문자(${SPECIAL_CHARS}) 포함`,
  ];
}

/**
 * 비밀번호 보안 점수 계산 (0-100)
 */
export function calculatePasswordScore(password: string): number {
  let score = 0;

  if (!password) return score;

  // 길이에 따른 점수
  if (password.length >= 8) score += 20;
  if (password.length >= 10) score += 10;
  if (password.length >= 12) score += 10;

  // 문자 종류에 따른 점수
  if (PASSWORD_REQUIREMENTS.hasLowercase.test(password)) score += 15;
  if (PASSWORD_REQUIREMENTS.hasUppercase.test(password)) score += 15;
  if (PASSWORD_REQUIREMENTS.hasNumber.test(password)) score += 15;
  if (PASSWORD_REQUIREMENTS.hasSpecialChar.test(password)) score += 15;

  // 보너스: 다양한 특수문자 사용
  const specialCharCount = (password.match(/[@$!%*?&#\-_+=]/g) || []).length;
  if (specialCharCount >= 2) score += 5;

  return Math.min(score, 100);
}
