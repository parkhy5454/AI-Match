import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

// 환경 변수에서 읽고, 없으면 기본값 사용 (Render 배포 환경 호환성)
const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production-12345';
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || 'default-reset-secret-change-in-production-12345';

// 토큰 만료 설정 (환경 변수로 커스터마이즈 가능)
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '24h'; // 기본값: 24시간
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d'; // 기본값: 7일

// 필수 환경 변수 검증
if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET 환경 변수가 설정되지 않았습니다. 기본값을 사용합니다.');
}

if (!RESET_TOKEN_SECRET) {
  console.warn('WARNING: RESET_TOKEN_SECRET 환경 변수가 설정되지 않았습니다. 기본값을 사용합니다.');
}

export async function hashPassword(password) {
  return bcryptjs.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcryptjs.compare(password, hash);
}

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

// 리프레시 토큰 생성
export function generateRefreshToken(userId) {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      console.warn('Token expired:', error.expiredAt);
      return null; // 토큰 만료
    }
    console.error('Token verification error:', error.message);
    return null;
  }
}

export function extractToken(req) {
  // Next.js 15 호환 - 여러 방식 시도
  let authHeader = null;

  // 방식 1: req.headers.get() (Headers 객체)
  if (req.headers && typeof req.headers.get === 'function') {
    authHeader = req.headers.get('authorization');
  }
  // 방식 2: req.headers.authorization (일반 객체)
  else if (req.headers && req.headers.authorization) {
    authHeader = req.headers.authorization;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}

export async function createSession(userId) {
  // JWT 토큰 생성
  return generateToken(userId);
}

// 토큰이 만료되었는지 확인
export function isTokenExpired(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET);
    return false;
  } catch (error: any) {
    return error.name === 'TokenExpiredError';
  }
}

export async function requireUser(req) {
  try {
    let token = null;

    // 방식 1: req.headers.get() (Headers 객체)
    if (req && typeof req.headers?.get === 'function') {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    // 방식 2: req.headers.authorization (일반 객체)
    else if (req?.headers?.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }

    if (!token) {
      throw new Error('인증 토큰이 없습니다');
    }

    // 토큰 만료 확인
    if (isTokenExpired(token)) {
      throw new Error('토큰이 만료되었습니다. 다시 로그인해주세요.');
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      throw new Error('유효하지 않은 토큰입니다');
    }

    return { id: decoded.userId };
  } catch (error) {
    console.error('requireUser 에러:', error);
    throw error;
  }
}

// 리프레시 토큰 검증
export function verifyRefreshToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'refresh') {
      return null;
    }
    return decoded;
  } catch (error: any) {
    console.error('Refresh token verification error:', error.message);
    return null;
  }
}

// 새로운 액세스 토큰 발급
export function refreshAccessToken(refreshToken: string) {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded || !decoded.userId) {
    return null;
  }
  return generateToken(decoded.userId);
}

// 비밀번호 리셋 토큰 생성 (1시간 유효)
export function generateResetToken(email) {
  return jwt.sign({ email }, RESET_TOKEN_SECRET, { expiresIn: '1h' });
}

// 비밀번호 리셋 토큰 검증
export function verifyResetToken(token) {
  try {
    return jwt.verify(token, RESET_TOKEN_SECRET);
  } catch (error) {
    return null;
  }
}

// 현재 사용자 조회 (선택적 req 파라미터)
export async function getCurrentUser(req?: any) {
  if (req) {
    return await requireUser(req);
  }
  // req가 없으면 null 반환
  return null;
}

// ===== Alias exports for compatibility =====

// Export requireUser as 'auth' for API route compatibility
export const auth = requireUser;

// Export a verifyAuth function
export const verifyAuth = requireUser;

// Export a getUserId function that extracts userId from request
export async function getUserId(req: any): Promise<string | null> {
  try {
    const user = await requireUser(req);
    return user?.id || null;
  } catch {
    return null;
  }
}

// Export verifyJWT for token verification
export { verifyToken as verifyJWT };

// Admin auth verification
export async function verifyAdminAuth(req: any): Promise<{ id: string } | null> {
  try {
    // For now, same as requireUser - could add admin role check later
    return await requireUser(req);
  } catch {
    return null;
  }
}
