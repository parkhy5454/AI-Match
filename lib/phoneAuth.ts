/**
 * 휴대폰 인증 유틸리티
 * OTP 생성, 발송, 검증
 */

interface PhoneAuthResult {
  success: boolean;
  message: string;
  code?: string;
}

/**
 * 휴대폰 번호 형식 검증
 * @param phone - 휴대폰 번호 (010-1234-5678 형식)
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^010-\d{4}-\d{4}$/;
  return phoneRegex.test(phone);
}

/**
 * OTP 코드 생성 (6자리 숫자)
 */
export function generateOTP(): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp;
}

/**
 * OTP 만료 시간 계산 (기본 5분)
 */
export function getOTPExpiresAt(expiresInMinutes = 5): Date {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
  return expiresAt;
}

/**
 * OTP 유효성 검증
 * @param storedOTP - 저장된 OTP
 * @param inputOTP - 사용자 입력 OTP
 * @param expiresAt - OTP 만료 시간
 */
export function verifyOTP(
  storedOTP: string,
  inputOTP: string,
  expiresAt: Date
): boolean {
  // OTP 코드 일치 확인
  if (storedOTP !== inputOTP) {
    return false;
  }

  // 만료 시간 확인
  if (new Date() > expiresAt) {
    return false;
  }

  return true;
}

/**
 * 휴대폰 번호 마스킹 (보안)
 * 예: 010-1234-5678 → 010-****-5678
 */
export function maskPhoneNumber(phone: string): string {
  return phone.replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3');
}

/**
 * 휴대폰 번호 정규화
 * 예: 01012345678 → 010-1234-5678
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 11) {
    return '';
  }
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
}

/**
 * 휴대폰 번호 기본 정보 추출
 */
export function extractPhoneInfo(phone: string): { carrier: string } {
  const prefix = phone.substring(0, 3);
  const carriers: { [key: string]: string } = {
    '010': 'SKT/KT/LG',
    '011': 'SKT',
    '016': 'SKT',
    '017': 'SKT',
    '018': 'SKT',
    '019': 'SKT',
    '020': 'KT',
    '021': 'KT',
    '022': 'KT',
    '023': 'KT',
    '024': 'KT',
    '025': 'KT',
    '026': 'KT',
    '029': 'KT',
    '030': 'LG',
    '031': 'LG',
    '032': 'LG',
    '033': 'LG',
    '035': 'LG',
    '036': 'LG',
    '037': 'LG',
    '038': 'LG',
    '039': 'LG',
  };

  return {
    carrier: carriers[prefix] || '알 수 없음',
  };
}
