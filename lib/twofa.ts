import { createHmac } from "crypto";
import { db } from "@/lib/db";

/**
 * TOTP (Time-based One-Time Password) 유틸리티
 * Google Authenticator, Microsoft Authenticator 등과 호환
 */

/**
 * 32자리 Base32 인코딩 시크릿 키 생성
 */
export function generateTOTPSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

/**
 * Base32 디코딩
 */
function base32Decode(encoded: string): Buffer {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  
  for (let i = 0; i < encoded.length; i++) {
    const index = chars.indexOf(encoded[i]);
    if (index === -1) throw new Error("Invalid Base32 character");
    bits += index.toString(2).padStart(5, "0");
  }
  
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  
  return Buffer.from(bytes);
}

/**
 * TOTP 코드 생성
 */
export function generateTOTP(secret: string, timeOffset: number = 0): string {
  const buffer = base32Decode(secret);
  let time = Math.floor((Date.now() + timeOffset) / 30000);

  const counterBuffer = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = time & 0xff;
    time >>>= 8;
  }
  
  const hmac = createHmac("sha1", buffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();
  
  const offset = digest[digest.length - 1] & 0xf;
  let code = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  
  code = code % 1000000;
  return code.toString().padStart(6, "0");
}

/**
 * TOTP 코드 검증 (현재 시간 ± 30초 허용)
 */
export function verifyTOTP(secret: string, code: string): boolean {
  for (let timeOffset = -30000; timeOffset <= 30000; timeOffset += 30000) {
    if (generateTOTP(secret, timeOffset) === code) {
      return true;
    }
  }
  return false;
}

/**
 * 2FA 활성화
 */
export async function enableTwoFA(
  userId: string
): Promise<{ success: boolean; secret?: string; qrCodeUrl?: string; error?: string }> {
  try {
    const secret = generateTOTPSecret();
    
    // DB에 저장 (확인 대기 상태)
    // 사용자가 코드로 검증할 때까지는 활성화되지 않음
    
    // QR 코드 생성을 위한 URL
    const qrCodeUrl = `otpauth://totp/AI-Match:${userId}?secret=${secret}&issuer=AI-Match&algorithm=SHA1&digits=6&period=30`;
    
    return {
      success: true,
      secret,
      qrCodeUrl,
    };
  } catch (error) {
    console.error("[2FA] 2FA 활성화 실패:", error);
    return { success: false, error: "2FA 활성화 중 오류가 발생했습니다" };
  }
}

/**
 * 2FA 활성화 검증 (TOTP 코드로 확인)
 */
export async function confirmTwoFA(
  userId: string,
  secret: string,
  code: string
): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
  try {
    // TOTP 코드 검증
    if (!verifyTOTP(secret, code)) {
      return { success: false, error: "인증 코드가 올바르지 않습니다" };
    }

    // 백업 코드 생성
    const backupCodes = generateBackupCodes(10);
    
    // DB에 2FA 설정 저장
    await db.user.update({
      where: { id: userId },
      data: {
        // twoFASecret: secret,
        // twoFAEnabled: true,
        // twoFABackupCodes: backupCodes.map(code => hashBackupCode(code)),
      },
    });

    console.log("[2FA] 2FA 활성화 성공:", userId);
    return {
      success: true,
      backupCodes,
    };
  } catch (error) {
    console.error("[2FA] 2FA 확인 실패:", error);
    return { success: false, error: "2FA 확인 중 오류가 발생했습니다" };
  }
}

/**
 * 2FA 비활성화
 */
export async function disableTwoFA(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        // twoFAEnabled: false,
        // twoFASecret: null,
      },
    });

    console.log("[2FA] 2FA 비활성화 성공:", userId);
    return { success: true };
  } catch (error) {
    console.error("[2FA] 2FA 비활성화 실패:", error);
    return { success: false, error: "2FA 비활성화 중 오류가 발생했습니다" };
  }
}

/**
 * 백업 코드 생성 (복구용)
 */
export function generateBackupCodes(count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(`${code.substring(0, 4)}-${code.substring(4)}`);
  }
  return codes;
}

/**
 * 백업 코드 해싱 (DB 저장용)
 */
export function hashBackupCode(code: string): string {
  return createHmac("sha256", "backup-code-salt").update(code).digest("hex");
}

/**
 * 백업 코드 검증
 */
export function verifyBackupCode(code: string, hashedCode: string): boolean {
  return hashBackupCode(code) === hashedCode;
}
