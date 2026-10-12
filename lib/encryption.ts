import crypto from 'crypto';

/**
 * 데이터 암호화/복호화 유틸리티
 * 민감한 정보(전화번호, 주소, 생년월일 등)를 암호화
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-32chars!!';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCODING = 'hex' as const;
const AUTH_TAG_LENGTH = 16;
const IV_LENGTH = 16;

interface EncryptedData {
  iv: string;
  encryptedData: string;
  authTag: string;
}

/**
 * 문자열 암호화
 */
export function encrypt(plaintext: string): string {
  try {
    if (!plaintext) return '';

    // 암호화 키 길이 확인 (32 bytes for aes-256)
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));

    // IV(초기화 벡터) 생성
    const iv = crypto.randomBytes(IV_LENGTH);

    // 암호화 수행
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);

    const authTag = cipher.getAuthTag();

    const result: EncryptedData = {
      iv: iv.toString(ENCODING),
      encryptedData: encrypted,
      authTag: authTag.toString(ENCODING),
    };

    // JSON으로 변환 후 Base64 인코딩
    return Buffer.from(JSON.stringify(result)).toString('base64');
  } catch (error) {
    console.error('[Encryption Error]', error);
    throw new Error('데이터 암호화 중 오류가 발생했습니다');
  }
}

/**
 * 문자열 복호화
 */
export function decrypt(encryptedString: string): string {
  try {
    if (!encryptedString) return '';

    // Base64 디코딩
    const buffer = Buffer.from(encryptedString, 'base64');
    const result: EncryptedData = JSON.parse(buffer.toString('utf8'));

    // 암호화 키 길이 확인
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    const iv = Buffer.from(result.iv, ENCODING);
    const authTag = Buffer.from(result.authTag, ENCODING);

    // 복호화 수행
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(result.encryptedData, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[Decryption Error]', error);
    throw new Error('데이터 복호화 중 오류가 발생했습니다');
  }
}

/**
 * 전화번호 마스킹 (010-1234-xxxx -> 010-1234-5678)
 */
export function maskPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';

  // 숫자만 추출
  const digits = phoneNumber.replace(/\D/g, '');

  if (digits.length === 10) {
    // 02-1234-5678 형식 (지역번호가 2자리)
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-****`;
  } else if (digits.length === 11) {
    // 010-1234-5678 형식
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-****`;
  }

  // 기본: 마지막 4자리만 ****로 표시
  return phoneNumber.slice(0, -4) + '****';
}

/**
 * 주소 마스킹 (상세 주소 숨김)
 */
export function maskAddress(address: string): string {
  if (!address) return '';

  // 예: "서울시 강남구 테헤란로 123 456호" -> "서울시 강남구"
  const parts = address.split(' ');

  // 최소 2개 부분(시/도, 구/군) 표시
  if (parts.length >= 2) {
    return parts.slice(0, 2).join(' ');
  }

  return parts[0] || '';
}

/**
 * 생년월일을 나이로 변환 및 마스킹
 */
export function maskBirthDate(birthDate: Date | string): string {
  try {
    const date = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;

    if (isNaN(date.getTime())) {
      return '';
    }

    // 나이 계산
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }

    return `${age}세`;
  } catch (error) {
    console.error('[Birth Date Masking Error]', error);
    return '';
  }
}

/**
 * 이메일 마스킹 (user@example.com -> u***@example.com)
 */
export function maskEmail(email: string): string {
  if (!email) return '';

  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;

  // 첫 글자와 마지막 글자만 표시
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }

  return `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}@${domain}`;
}

/**
 * 민감한 데이터가 포함된 객체의 특정 필드를 복호화
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToDecrypt: (keyof T)[]
): T {
  const result = { ...obj };

  for (const field of fieldsToDecrypt) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = decrypt(result[field] as string) as any;
      } catch (error) {
        console.error(`[Decryption Error] Failed to decrypt field: ${String(field)}`);
        // 복호화 실패 시 원본 값 유지
      }
    }
  }

  return result;
}

/**
 * 민감한 데이터가 포함된 객체의 특정 필드를 암호화
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const result = { ...obj };

  for (const field of fieldsToEncrypt) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = encrypt(result[field] as string) as any;
      } catch (error) {
        console.error(`[Encryption Error] Failed to encrypt field: ${String(field)}`);
        throw error;
      }
    }
  }

  return result;
}

/**
 * 복호화된 사용자 객체에서 민감한 정보를 마스킹된 버전으로 변환
 */
export function maskSensitiveFields(user: any): any {
  const masked = { ...user };

  if (masked.phoneNumber) {
    masked.phoneNumberMasked = maskPhoneNumber(masked.phoneNumber);
  }

  if (masked.address) {
    masked.addressMasked = maskAddress(masked.address);
  }

  if (masked.birthDate) {
    masked.ageMasked = maskBirthDate(masked.birthDate);
  }

  if (masked.email) {
    masked.emailMasked = maskEmail(masked.email);
  }

  return masked;
}

/**
 * 환경 변수 검증
 */
export function validateEncryptionSetup(): boolean {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    console.warn('[Encryption Warning] ENCRYPTION_KEY not set, using default key. This is NOT secure for production!');
    return false;
  }

  if (encryptionKey.length < 32) {
    console.warn('[Encryption Warning] ENCRYPTION_KEY is less than 32 characters. Consider using a stronger key.');
    return false;
  }

  return true;
}
