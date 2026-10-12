/**
 * 입력값 검증 유틸리티
 */

const VALID_MBTI = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'
];

export function validateAge(age: any): { valid: boolean; error?: string } {
  const numAge = Number(age);
  if (isNaN(numAge)) {
    return { valid: false, error: '나이는 숫자여야 합니다' };
  }
  if (numAge < 18 || numAge > 100) {
    return { valid: false, error: '나이는 18~100 사이여야 합니다' };
  }
  return { valid: true };
}

export function validateMBTI(mbti: any): { valid: boolean; error?: string } {
  if (!mbti || typeof mbti !== 'string') {
    return { valid: false, error: 'MBTI는 필수입니다' };
  }
  const upperMBTI = mbti.toUpperCase();
  if (!VALID_MBTI.includes(upperMBTI)) {
    return { valid: false, error: '유효하지 않은 MBTI입니다' };
  }
  return { valid: true };
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  // RFC 5322 compliant email validation (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: '유효하지 않은 이메일 형식입니다' };
  }
  if (email.length > 254) {
    return { valid: false, error: '이메일은 254자 이하여야 합니다' };
  }
  // 기본적인 추가 검증
  if (email.includes('..')) {
    return { valid: false, error: '유효하지 않은 이메일 형식입니다' };
  }
  return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: '비밀번호는 필수입니다' };
  }

  if (password.length < 8) {
    return { valid: false, error: '비밀번호는 최소 8자 이상이어야 합니다' };
  }

  if (password.length > 128) {
    return { valid: false, error: '비밀번호는 128자 이하여야 합니다' };
  }

  // 대문자 확인
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: '비밀번호에 최소 1개 이상의 대문자를 포함해야 합니다' };
  }

  // 소문자 확인
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: '비밀번호에 최소 1개 이상의 소문자를 포함해야 합니다' };
  }

  // 숫자 확인
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: '비밀번호에 최소 1개 이상의 숫자를 포함해야 합니다' };
  }

  // 특수문자 확인
  if (!/[!@#$%^&*()_\-+=\[\]{};:'",.<>?\/\\|`~]/.test(password)) {
    return { valid: false, error: '비밀번호에 최소 1개 이상의 특수문자(!@#$%^&* 등)를 포함해야 합니다' };
  }

  return { valid: true };
}

export function validateRegion(region: any): { valid: boolean; error?: string } {
  if (!region || typeof region !== 'string' || region.trim().length === 0) {
    return { valid: false, error: '지역은 필수입니다' };
  }
  if (region.length > 50) {
    return { valid: false, error: '지역은 50자 이하여야 합니다' };
  }
  return { valid: true };
}

export function validateBio(bio: any): { valid: boolean; error?: string } {
  if (bio !== undefined && bio !== null) {
    if (typeof bio !== 'string') {
      return { valid: false, error: '자기소개는 문자열이어야 합니다' };
    }
    if (bio.length > 500) {
      return { valid: false, error: '자기소개는 500자 이하여야 합니다' };
    }
  }
  return { valid: true };
}

export function validateProfileImage(imageUrl: any): { valid: boolean; error?: string } {
  if (imageUrl === undefined || imageUrl === null) {
    return { valid: true };
  }

  if (typeof imageUrl !== 'string') {
    return { valid: false, error: '프로필 이미지는 유효한 URL이어야 합니다' };
  }

  // 빈 문자열은 허용 (이미지 제거)
  if (imageUrl === '') {
    return { valid: true };
  }

  try {
    // URL 형식 검증
    new URL(imageUrl);

    // 안전한 프로토콜만 허용 (http, https, data)
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('data:')) {
      return { valid: false, error: '프로필 이미지는 http, https 또는 data URL이어야 합니다' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: '프로필 이미지 URL 형식이 유효하지 않습니다' };
  }
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.length < 3 || username.length > 20) {
    return { valid: false, error: '사용자명은 3~20자여야 합니다' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: '사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다' };
  }
  return { valid: true };
}

/**
 * 전화번호 검증 (선택사항)
 * 지원 형식: 010-1234-5678, 02-123-4567, 01012345678 등
 */
export function validatePhoneNumber(phoneNumber: any): { valid: boolean; error?: string } {
  if (phoneNumber === undefined || phoneNumber === null || phoneNumber === '') {
    return { valid: true }; // 선택사항
  }

  if (typeof phoneNumber !== 'string') {
    return { valid: false, error: '전화번호는 문자열이어야 합니다' };
  }

  // 숫자만 추출
  const digits = phoneNumber.replace(/\D/g, '');

  // 한국 전화번호 길이 확인 (10~11자리)
  if (digits.length < 10 || digits.length > 11) {
    return { valid: false, error: '유효하지 않은 전화번호 형식입니다 (010-1234-5678 또는 02-123-4567)' };
  }

  // 시작 번호 확인
  if (!['0', '1'].includes(digits[0])) {
    return { valid: false, error: '유효하지 않은 전화번호입니다' };
  }

  return { valid: true };
}

/**
 * 주소 검증 (선택사항)
 */
export function validateAddress(address: any): { valid: boolean; error?: string } {
  if (address === undefined || address === null || address === '') {
    return { valid: true }; // 선택사항
  }

  if (typeof address !== 'string') {
    return { valid: false, error: '주소는 문자열이어야 합니다' };
  }

  const trimmed = address.trim();

  if (trimmed.length < 5) {
    return { valid: false, error: '주소는 5자 이상이어야 합니다' };
  }

  if (trimmed.length > 255) {
    return { valid: false, error: '주소는 255자 이하여야 합니다' };
  }

  return { valid: true };
}

/**
 * 생년월일 검증 (선택사항)
 * 지원 형식: ISO 8601 (YYYY-MM-DD), 타임스탐프 등
 */
export function validateBirthDate(birthDate: any): { valid: boolean; error?: string } {
  if (birthDate === undefined || birthDate === null || birthDate === '') {
    return { valid: true }; // 선택사항
  }

  const date = new Date(birthDate);

  if (isNaN(date.getTime())) {
    return { valid: false, error: '유효하지 않은 날짜 형식입니다 (YYYY-MM-DD)' };
  }

  // 최소 나이 18세 확인
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();

  let actualAge = age;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    actualAge--;
  }

  if (actualAge < 18) {
    return { valid: false, error: '18세 이상만 가입 가능합니다' };
  }

  if (actualAge > 120) {
    return { valid: false, error: '유효하지 않은 생년월일입니다' };
  }

  return { valid: true };
}
