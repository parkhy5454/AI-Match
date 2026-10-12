import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-unsafe-key';
const ALGORITHM = 'aes-256-gcm';

/**
 * 데이터 암호화
 */
export async function encryptData(data: string): Promise<string> {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}.${encrypted}.${authTag.toString('hex')}`;
}

/**
 * 데이터 복호화
 */
export async function decryptData(encrypted: string): Promise<string> {
  const [ivHex, encryptedHex, authTagHex] = encrypted.split('.');

  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const authTag = Buffer.from(authTagHex, 'hex');

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * 비밀번호 해싱 (bcrypt)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * 비밀번호 검증
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 민감한 데이터 마스킹
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const masked = local.substring(0, 2) + '*'.repeat(local.length - 2);
  return `${masked}@${domain}`;
}

export function maskPhoneNumber(phone: string): string {
  return phone.substring(0, 3) + '*'.repeat(phone.length - 6) + phone.substring(phone.length - 3);
}

export function maskCreditCard(card: string): string {
  return '*'.repeat(12) + card.substring(card.length - 4);
}
